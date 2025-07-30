import express from 'express';
import fs from 'fs';
import mime from 'mime-types'
import path from 'path';


const app = express();
export default async function startProxyServer(options){
    app.use(async (req, res, next) => {
        let requestRoute = `./cache${req.path}`;
        console.log(`Fetching from origin: ${options.origin + req.path}`);
        if(fs.existsSync(requestRoute)) {
            const cacheFilePath = fs.readdirSync(requestRoute)[0];
            const absolutePath = path.resolve(`${requestRoute}/${cacheFilePath}`);
            console.log(`Cache miss for ${req.url}`);
            res.setHeader('X-Cache', 'HIT');
            res.sendFile(absolutePath);
            return;
        }else{
            fs.mkdirSync(requestRoute, { recursive: true });
            const response = await fetch(options.origin + req.path)
            if(!response.ok){
                console.error(`Failed to fetch from origin: ${response.statusText}`);
                res.status(response.status).send(`Error fetching from origin: ${response.statusText}`);
                return;
            }
            const data = Buffer.from(await response.arrayBuffer());
            console.log(`Fetching data: ${response.url}, type: ${response.headers.get('content-type')} , res: ${response}`);
            const fileType = mime.extension(response.headers.get('content-type')) || 'txt';
            requestRoute += `/response${Date.now()}.${fileType}`;
            const absolutePath = path.resolve(requestRoute);
            console.log(`Serving cached response for ${req.url}`);
            fs.writeFileSync(absolutePath, data);
            console.log(`Cache miss for ${req.url}, writing to cache.`);
            let header={};
            response.headers.forEach((value, key) => {
                if(key !== 'content-encoding' && key != 'transfer-encoding' && key != 'content-length') {
                    header[key] = value;
                }
            });
            res.set(header);
            res.setHeader('X-Cache', 'MISS');
            res.sendFile(absolutePath);
            return;
        }
    });

    app.listen(options.port,()=>{
        console.log(`Cache proxy server started on port ${options.port}`);
        console.log(`Origin server: ${options.origin}`);
        console.log(`Test with: curl http://localhost:${options.port}/your-path`);
    });
}

