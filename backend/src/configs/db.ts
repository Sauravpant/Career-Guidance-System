import { PrismaClient } from "../generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";

const rawUrl = process.env.DATABASE_URL as string;
const connectionString = rawUrl.includes("pgbouncer=")
  ? rawUrl
  : `${rawUrl}${rawUrl.includes("?") ? "&" : "?"}pgbouncer=true&connection_limit=5&pool_timeout=10`;

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({
  adapter,
  log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
});
export { prisma };

export default prisma;
