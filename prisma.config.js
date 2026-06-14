import { defineConfig } from "prisma/config";
import dotenv from "dotenv";

// Manually load your .env file so Prisma can read DATABASE_URL
dotenv.config();

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
      path: "prisma/migrations",
      seed :"tsx ./prisma/seed.ts",
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
