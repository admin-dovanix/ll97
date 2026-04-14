import Fastify from "fastify";
import { apiEnv } from "./config/env.js";
import { registerRoutes } from "./routes/index.js";

const app = Fastify({
  logger: true
});

await registerRoutes(app);

await app.listen({
  port: apiEnv.apiPort,
  host: "0.0.0.0"
});
