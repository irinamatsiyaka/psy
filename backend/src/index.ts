import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { env } from "./config";
import { initDb } from "./db/init";
import { authRouter } from "./routes/auth";
import { appRouter } from "./routes/app";

import { usersRouter } from "./routes/users";
import { conversationsRouter } from "./routes/conversations";
const app = express();

app.use(
  cors({
    origin: (requestOrigin, callback) => {
      if (!requestOrigin) {
        callback(null, true);
        return;
      }

      if (env.CORS_ORIGINS.includes(requestOrigin) || env.CORS_ORIGINS.includes("*")) {
        callback(null, true);
        return;
      }

      callback(new Error(`Origin ${requestOrigin} not allowed by CORS`));
    },
    credentials: true
  })
);
app.use(express.json({ limit: "6mb" }));
app.use(cookieParser());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/auth", authRouter);
app.use("/app", appRouter);

app.use("/users", usersRouter);
app.use("/conversations", conversationsRouter);

const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const initDbWithRetry = async (): Promise<void> => {
  while (true) {
    try {
      await initDb();
      return;
    } catch (error) {
      console.error("Database init failed, retrying in 3s", error);
      await wait(3000);
    }
  }
};

const start = async (): Promise<void> => {
  await initDbWithRetry();

  app.listen(env.PORT, () => {
    console.log(`Backend running on http://localhost:${env.PORT}`);
  });
};

start().catch((error) => {
  console.error("Failed to start backend", error);
  process.exit(1);
});
