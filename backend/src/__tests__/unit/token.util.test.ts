import jwt from "jsonwebtoken";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "../../utils/token";

const ACCESS_SECRET = process.env.ACCESS_TOKEN_SECRET!;
const REFRESH_SECRET = process.env.REFRESH_TOKEN_SECRET!;
describe("generateAccessToken", () => {
  it("returns a valid JWT string", () => {

    const token = generateAccessToken("user-1");
    expect(typeof token).toBe("string");
    expect(token.split(".")).toHaveLength(3);
  });
  it("embeds the user id in the payload", () => {

    const token = generateAccessToken("user-42");
    const decoded = jwt.verify(token, ACCESS_SECRET) as any;
    expect(decoded.id).toBe("user-42");
  });
  it("expires in 15 minutes", () => {

    const token = generateAccessToken("user-1");
    const decoded = jwt.decode(token) as any;
    const iat = decoded.iat;
    const exp = decoded.exp;
    expect(exp - iat).toBe(900);
  });
});
describe("generateRefreshToken", () => {
  it("returns a valid JWT string", () => {

    const token = generateRefreshToken("user-1");
    expect(typeof token).toBe("string");
    expect(token.split(".")).toHaveLength(3);
  });
  it("embeds the user id in the payload", () => {

    const token = generateRefreshToken("user-99");
    const decoded = jwt.verify(token, REFRESH_SECRET) as any;
    expect(decoded.id).toBe("user-99");
  });
  it("expires in 7 days", () => {

    const token = generateRefreshToken("user-1");
    const decoded = jwt.decode(token) as any;
    const iat = decoded.iat;
    const exp = decoded.exp;
    expect(exp - iat).toBe(604800);
  });
  it("generates tokens different from the access token for same user", () => {

    const access = generateAccessToken("user-1");
    const refresh = generateRefreshToken("user-1");
    expect(access).not.toBe(refresh);
  });
});
describe("verifyRefreshToken", () => {
  it("successfully verifies a valid refresh token", () => {

    const token = generateRefreshToken("user-7");
    const decoded = verifyRefreshToken(token) as any;
    expect(decoded.id).toBe("user-7");
  });
  it("throws JsonWebTokenError for a tampered token", () => {

    const token = generateRefreshToken("user-1");
    const tampered = token.slice(0, -5) + "XXXXX";
    expect(() => verifyRefreshToken(tampered)).toThrow();
  });
  it("throws JsonWebTokenError for a token signed with wrong secret", () => {

    const badToken = jwt.sign({ id: "user-1" }, "wrong-secret", {
      expiresIn: "7d",
    });
    expect(() => verifyRefreshToken(badToken)).toThrow();
  });
  it("throws TokenExpiredError for an already-expired token", () => {

    const expiredToken = jwt.sign({ id: "user-1" }, REFRESH_SECRET, {
      expiresIn: -1,
    });
    expect(() => verifyRefreshToken(expiredToken)).toThrow();
  });
});
