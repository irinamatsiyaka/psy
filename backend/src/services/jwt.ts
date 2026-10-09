import jwt, { SignOptions } from "jsonwebtoken";
import { randomUUID } from "crypto";
import { env } from "../config";

type AccessPayload = {
  sub: string;
  email: string;
};

type RefreshPayload = {
  sub: string;
  tokenId: string;
};

export const signAccessToken = (userId: number, email: string): string => {
  const payload: AccessPayload = { sub: String(userId), email };
  const options: SignOptions = {
    expiresIn: env.ACCESS_TOKEN_TTL as SignOptions["expiresIn"]
  };
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, options);
};

export const signRefreshToken = (userId: number): { token: string; tokenId: string } => {
  const tokenId = randomUUID();
  const payload: RefreshPayload = { sub: String(userId), tokenId };
  const options: SignOptions = {
    expiresIn: `${env.REFRESH_TOKEN_TTL_DAYS}d` as SignOptions["expiresIn"]
  };
  const token = jwt.sign(payload, env.JWT_REFRESH_SECRET, options);
  return { token, tokenId };
};

export const verifyAccessToken = (token: string): AccessPayload => {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessPayload;
};

export const verifyRefreshToken = (token: string): RefreshPayload => {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshPayload;
};
