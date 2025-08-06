import express from 'express';
import fs from 'fs';
import mime from 'mime-types'
import path from 'path';
import crypto from 'crypto';
import { db } from './db/db.js';
import { cacheMetadata } from './db/schema.js';
import { eq } from 'drizzle-orm';
import redis from './utils/redis.js';


const app = express();
const TTL = 1000 * 60 * 60 * 24; // 1 day


export async function startProxyServer(options) {
    app.use(async (req, res, next) => {
        const fullUrl = options.origin + req.url;
        const hashedFileName = crypto.createHash('sha256').update(fullUrl).digest('hex');
        const cacheDir = path.join('./cache', req.path)
        let contentType = 'application/octet-stream';
        console.log(`Request URL: ${fullUrl}`);
        let meta = await redis.get(`meta:${hashedFileName}`);
        if (meta) {
            meta = JSON.parse(meta);
            const isExpired = new Date(meta.lastAccessed).getTime() + TTL < Date.now();
            if (!isExpired) {
                console.log(`Redis cache hit for: ${fullUrl}`);
                const cachedData = await redis.get(`cache:${hashedFileName}`);
                if (cachedData) {
                    res.setHeader('X-Cache', 'HIT-REDIS');
                    res.setHeader('Content-Type', meta.contentType || contentType);
                    return res.end(Buffer.from(cachedData, 'base64')); // Base64 decode
                }
            } else {
                console.log(`Redis cache expired for: ${fullUrl}`);
                await redis.del(`meta:${hashedFileName}`);
                await redis.del(`cache:${hashedFileName}`);
            }
        }
        meta = db.select().from(cacheMetadata).where(eq(cacheMetadata.hash, hashedFileName)).get();

        const isExpired = meta && (new Date(meta.lastAccessed).getTime() + TTL < Date.now());
        if (meta && !isExpired) {
            console.log(`Cache hit for: ${fullUrl}`);
            res.setHeader('X-Cache', 'HIT');
            res.setHeader('Content-Type', meta.contentType || contentType);
            return res.sendFile(path.resolve(meta.path));
        } else if (meta && isExpired) {
            console.log(`Cache expired for: ${fullUrl}`);
            db.delete(cacheMetadata).where(eq(cacheMetadata.hash, hashedFileName)).run();
            fs.rmSync(meta.path, { recursive: true, force: true });
        }
        const response = await fetch(fullUrl);
        if (!response.ok) {
            res.status(response.status).send(`Error fetching from origin: ${response.statusText}`);
            return;
        }
        console.log(`Cache miss for: ${fullUrl}`);
        const data = Buffer.from(await response.arrayBuffer());
        contentType = response.headers.get('content-type') || contentType;
        let extension = mime.extension(contentType);
        let cacheFilePath = path.join(cacheDir, `${hashedFileName}.${extension}`);

        fs.mkdirSync(cacheDir, { recursive: true });
        fs.writeFileSync(cacheFilePath, data);
        await redis.set(`cache:${hashedFileName}`, data.toString('base64'), { EX: TTL / 1000 });
        await redis.set(`meta:${hashedFileName}`, JSON.stringify({
            path: cacheFilePath,
            contentType,
            lastAccessed: new Date().toISOString()
        }), { EX: TTL / 1000 });

        const headers = {};
        response.headers.forEach((value, name) => {
            if (!['content-encoding', 'transfer-encoding', 'content-length'].includes(name)) {
                headers[name] = value;
            }
        });
        await db.insert(cacheMetadata).values({
            hash: hashedFileName,
            url: fullUrl,
            path: cacheFilePath,
            extension: extension,
            contentType: contentType,
            headers: JSON.stringify(headers),
            lastAccessed: new Date().toISOString()
        })
        res.set(headers);
        res.setHeader('X-Cache', 'MISS');
        return res.sendFile(path.resolve(cacheFilePath));
    });

    app.listen(options.port, () => {
        console.log(`Cache proxy server started on port ${options.port}`);
        console.log(`Origin server: ${options.origin}`);
        console.log(`Test with: curl http://localhost:${options.port}/your-path`);
    });
}

export async function clearCache() {
    const cacheDir = './cache/';
    if (fs.existsSync(cacheDir)) {
        await redis.flushall();
        fs.rmSync(cacheDir, { recursive: true, force: true });
        db.delete(cacheMetadata).run();
        console.log('Cache cleared successfully.');
    } else {
        console.log('No cache directory found to clear.');
    }
}
