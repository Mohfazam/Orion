import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

console.log("DB URL:", process.env.DATABASE_URL);