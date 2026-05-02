import mysql from "mysql2/promise";
import { readFileSync } from "fs";

const url = process.env.DATABASE_URL;
if (!url) { console.error("DATABASE_URL not set"); process.exit(1); }

const conn = await mysql.createConnection(url);
const sql = readFileSync("drizzle/0054_nostalgic_dark_beast.sql", "utf-8");
const statements = sql.split("--> statement-breakpoint").map(s => s.trim()).filter(Boolean);

for (const stmt of statements) {
  try {
    await conn.execute(stmt);
    console.log("OK:", stmt.slice(0, 60));
  } catch (e) {
    if (e.code === "ER_DUP_FIELDNAME" || e.code === "ER_TABLE_EXISTS_ERROR") {
      console.log("SKIP (already exists):", stmt.slice(0, 60));
    } else {
      console.error("ERR:", e.message, "\nSQL:", stmt.slice(0, 100));
    }
  }
}
await conn.end();
console.log("Migration v5.2 done");
