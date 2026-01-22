import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { ApiError } from "./utils/ApiError.js";

const app = express();

app.use(
    cors({
        origin: process.env.CORS_ORIGIN,
        credentials: true,
    })
);

app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());


//routes import
import healthcheckRouter from "./routes/healthcheck.routes.js";
import userRouter from "./routes/user.routes.js";
import verifcationRouter from "./routes/verification.routes.js";
import routineRouter from "./routes/routine.routes.js";
import progressRouter from "./routes/progress.routes.js";


//routes declaration
app.use("/api/v1/healthcheck", healthcheckRouter);
app.use("/api/v1/user", userRouter);
app.use("/api/v1/verify", verifcationRouter);
app.use("/api/v1/routine", routineRouter);
app.use("/api/v1/progress", progressRouter);


export const globalErrorHandler = (err, req, res, next) => {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      statusCode: err.statusCode,
      success: false,
      message: err.message,
      errors: err.errors || [],
    });
  }

  console.error(err);

  res.status(500).json({
    statusCode: 500,
    success: false,
    message: err.message || "Internal Server Error",
    errors: [],
  });
};

app.use(globalErrorHandler);

export { app };