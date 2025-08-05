#!/usr/bin/env node
import { Command } from "commander";
import {startProxyServer,clearCache} from "./server.js";
const program = new Command();

program
  .name("cache-proxy")
  .description("A cache proxy server to cache the request")
  .version("1.0.0");

program
    .command("start")
    .description("Start the cache proxy server")
    .alias("s")
    .requiredOption("-p, --port <number>","Specify port to run the server on")
    .requiredOption("-o, --origin <url>","Specify the origin url to which the requests are being called").action((options)=>{
        if(!options.port || isNaN(options.port)) {
            console.error("Invalid port number. Please provide a valid number.");
            process.exit(1);
        }
        if(!options.origin || !/^https?:\/\/.+/.test(options.origin)) {
            console.error("Invalid origin URL. Please provide a valid URL starting with http:// or https://.");
            process.exit(1);
        }
        startProxyServer(options);
    });

program
    .command("clear")
    .description("Clear the cache")
    .alias("cls")
    .action(async () => {
        clearCache();
    });
program.parse(process.argv);
