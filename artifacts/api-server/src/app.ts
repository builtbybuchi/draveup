import express, { type Express } from "express";
import cors from "cors";
import { clerkMiddleware } from "@clerk/express";
import { CLERK_PROXY_PATH, clerkProxyMiddleware } from "./middlewares/clerkProxyMiddleware";
import router from "./routes";
import paystackWebhookRouter from "./routes/paystackWebhook.js";
import { logger } from "./lib/logger";

const app: Express = express();

// Custom request logging middleware (replaces pino-http)
app.use((req, res, next) => {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;
    logger.info({
      method: req.method,
      url: req.url?.split("?")[0],
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      // You can add more fields if needed
    });
  });

  next();
});

app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());

app.use(cors({ credentials: true, origin: true }));

// Paystack webhook MUST receive the raw body so we can verify the HMAC-SHA512
// signature; mount it before express.json() consumes the stream.
app.use(paystackWebhookRouter);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(clerkMiddleware());

app.use("/api", router);

export default app;