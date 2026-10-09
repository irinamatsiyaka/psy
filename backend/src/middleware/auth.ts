import { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "../services/jwt";

export const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ message: "Missing bearer token" });
    return;
  }

  const token = authHeader.slice("Bearer ".length);
  try {
    const payload = verifyAccessToken(token);
    req.user = { id: Number(payload.sub), email: payload.email };
    next();
  } catch {
    res.status(401).json({ message: "Invalid or expired access token" });
  }
};
