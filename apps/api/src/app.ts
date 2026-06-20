import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { resolve } from "node:path";
import { env } from "./config/env.js";
import { errorHandler } from "./middleware/error.js";
import { apiRouter } from "./routes/index.js";

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: env.WEB_ORIGIN, credentials: true }));
  app.use(
    "/uploads",
    express.static(resolve(process.cwd(), "uploads"), {
      setHeaders(res) {
        res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
      }
    })
  );
  app.use(express.json());
  app.use(morgan("dev"));

  app.use("/api", apiRouter);
  app.use(errorHandler);

  return app;
}
