import express from 'express';
import fs from 'fs';


const app = express();
export default async function startProxyServer(options){
    app.use((req, res, next) => {
        console.log(`Received request for ${req.url} with method ${req.method}`);
        console.log(`Headers:`, req.headers);
        console.log(`Query params:`, req.query);

        let filePath = `./cache${req.path}`;
        if(fs.existsSync(filePath)) {
            console.log(`Cache hit for ${req.url}`);
            filePath += '/response.txt';
            const cachedData = fs.readFileSync(filePath, 'utf-8');
            res.send(cachedData);
            return;
        }else{
            fs.mkdirSync(filePath, { recursive: true });
            filePath+='/response.txt';
            fs.writeFileSync(filePath, `Cached response for ${req.url} at ${new Date().toISOString()}`);
            console.log(`Cache miss for ${req.url}, writing to cache.`);
            res.send(`Cached response for ${req.url} at ${new Date().toISOString()}`);
            return;
        }
    });

    app.listen(options.port,()=>{
        console.log(`Cache proxy server started on port ${options.port}`);
        console.log(`Origin server: ${options.origin}`);
        console.log(`Test with: curl http://localhost:${options.port}/your-path`);
    });
}

