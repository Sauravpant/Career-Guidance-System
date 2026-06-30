import { PrismaClient } from "../generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL as string });

const prisma = new PrismaClient({
  adapter,
  log: ["error", "warn"],
});

export { prisma };
export default prisma;
