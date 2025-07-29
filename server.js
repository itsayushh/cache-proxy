import express from 'express';
import fs from 'fs';
import mime from 'mime-types'


const app = express();
export default async function startProxyServer(options){
    app.use(async (req, res, next) => {
        // console.log(`Received request for ${req.url} with method ${req.method}`);
        // console.log(`Headers:`, req.headers);
        // console.log(`Query params:`, req.query);
        let requestRoute = `./cache${req.path}`;
        console.log(`Fetching from origin: ${options.origin + req.path}`);
        if(fs.existsSync(requestRoute)) {
            const cacheFilePath = fs.readdirSync(requestRoute)[0];
            const content = fs.readFileSync(`${requestRoute}/${cacheFilePath}`, 'utf-8');
            console.log(`Cache hit for ${req.url}`);
            res.send(content);
            return;
        }else{
            fs.mkdirSync(requestRoute, { recursive: true });
            const response = await fetch(options.origin + req.path)
            if(!response.ok){
                console.error(`Failed to fetch from origin: ${response.statusText}`);
                res.status(response.status).send(`Error fetching from origin: ${response.statusText}`);
                return;
            }
            const data = await response.json();
            console.log(`Fetching data: ${response.url}, type: ${response.headers.get('content-type')} , res: ${response}`);
            const fileType = mime.extension(response.headers.get('content-type')) || 'txt';
            requestRoute += `/response${Date.now()}.${fileType}`;
            console.log(`Serving cached response for ${req.url}`);
            fs.writeFileSync(requestRoute, JSON.stringify(data));
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

