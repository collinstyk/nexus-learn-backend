import { PrismaClient } from "./generated/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import  dotenv from "dotenv";

dotenv.config();

const pool = new pg.Pool();
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({adapter});

export default prisma;