import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { seed } from "./seed.js";

// Define the database file path
const dbPath = path.resolve(import.meta.dirname, "../../database.sqlite");
const isNewDb = !fs.existsSync(dbPath);

console.log(`Using database at: ${dbPath}`);

const db = new Database(dbPath);
db.pragma("journal_mode = WAL");

// Seed the database if it's new
if (isNewDb) {
  seed(db);
} else {
  console.log("Database already exists, skipping seed.");
}

export default db;
