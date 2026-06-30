const jwt = require("jsonwebtoken") as {
  sign: (payload: object, secret: string, options?: { expiresIn?: string | number }) => string;
  verify: (token: string, secret: string) => any;
};

const getSecret = (name: string): string => {
  const secret = process.env[name];
  if (!secret) {
    throw new Error(`${name} is not defined`);
  }
  return secret;
};

export const generateAccessToken = (id: string): string => {
  return jwt.sign({ id }, getSecret("ACCESS_TOKEN_SECRET"), { expiresIn: "15m" });
};

export const generateRefreshToken = (id: string): string => {
  return jwt.sign({ id }, getSecret("REFRESH_TOKEN_SECRET"), { expiresIn: "7d" });
};

export const verifyRefreshToken = (token: string): any => {
  return jwt.verify(token, getSecret("REFRESH_TOKEN_SECRET"));
};
