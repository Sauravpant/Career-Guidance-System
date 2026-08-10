import jwt from "jsonwebtoken";

const ACCESS_SECRET = ((): string => {
  const s = process.env.ACCESS_TOKEN_SECRET;

  if (!s) throw new Error("ACCESS_TOKEN_SECRET is not defined");

  return s;
})();

const REFRESH_SECRET = ((): string => {
  const s = process.env.REFRESH_TOKEN_SECRET;

  if (!s) throw new Error("REFRESH_TOKEN_SECRET is not defined");

  return s;
})();

export const generateAccessToken = (id: string): string => {

  return jwt.sign({ id }, ACCESS_SECRET, { expiresIn: "15m" });
};

export const generateRefreshToken = (id: string): string => {

  return jwt.sign({ id }, REFRESH_SECRET, { expiresIn: "7d" });
};

export const verifyRefreshToken = (token: string): any => {

  return jwt.verify(token, REFRESH_SECRET);
};
