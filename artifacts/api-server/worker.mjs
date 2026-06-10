import { createServer } from "node:http";
import { httpServerHandler } from "cloudflare:node";
import app from "./src/app.ts";

const server = createServer(app);

export default httpServerHandler(server);
