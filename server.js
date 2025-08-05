import express from 'express';
import fs from 'fs';
import mime from 'mime-types'
import path from 'path';
import crypto from 'crypto';
import { db } from './db/db.js';
import { cacheMetadata } from './db/schema.js';
import { eq } from 'drizzle-orm';


const app = express();
export async function startProxyServer(options){
    app.use(async (req, res, next) => {
        const fullUrl = options.origin + req.url;
        const hashedFileName = crypto.createHash('sha256').update(fullUrl).digest('hex');
        const cacheDir = path.join('./cache',req.path)
        let contentType = 'application/octet-stream';
        console.log(`Request URL: ${fullUrl}`);
        const meta = db.select().from(cacheMetadata).where(eq(cacheMetadata.hash, hashedFileName)).get();
        if(meta && fs.existsSync(meta.path)) {
            console.log(`Cache hit for: ${fullUrl}`);
            res.setHeader('X-Cache', 'HIT');
            res.setHeader('Content-Type', meta.contentType || contentType);
            return res.sendFile(path.resolve(meta.path));
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

    app.listen(options.port,()=>{
        console.log(`Cache proxy server started on port ${options.port}`);
        console.log(`Origin server: ${options.origin}`);
        console.log(`Test with: curl http://localhost:${options.port}/your-path`);
    });
}

export async function clearCache() {
    const cacheDir = './cache/';
    if (fs.existsSync(cacheDir)) {
        fs.rmSync(cacheDir, { recursive: true, force: true });
        db.delete(cacheMetadata).run();
        console.log('Cache cleared successfully.');
    } else {
        console.log('No cache directory found to clear.');
    }
}
