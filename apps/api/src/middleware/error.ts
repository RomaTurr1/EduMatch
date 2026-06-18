import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof ZodError) {
    return res.status(400).json({ message: "Validation failed", issues: error.flatten() });
  }

  const status = typeof error.status === "number" ? error.status : 500;
  return res.status(status).json({
    message: status === 500 ? "Internal server error" : error.message
  });
};
