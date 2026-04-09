import "dotenv/config";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { Pool } from "pg";

const currentFilePath = fileURLToPath(import.meta.url);
const scriptDirPath = path.dirname(currentFilePath);
const defaultCatalogPath = path.resolve(scriptDirPath, "../src/data/catalog/foods.curated.json");

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL gerekli.");
  process.exit(1);
}

const catalogPath = process.env.FOOD_CATALOG_PATH || defaultCatalogPath;
const pruneUnknown = String(process.env.FOODS_PRUNE_UNKNOWN || "true").toLowerCase() === "true";

function normalizeItem(item) {
  if (!item || typeof item !== "object") {
    return null;
  }

  const id = String(item.id || "").trim();
  const name = String(item.name || "").trim();
  const type = String(item.type || "").trim();
  if (!id || !name || !["protein", "carb", "fat"].includes(type)) {
    return null;
  }

  const protein = Math.max(0, Number(item.protein) || 0);
  const carb = Math.max(0, Number(item.carb) || 0);
  const fat = Math.max(0, Number(item.fat) || 0);
  const calories = Math.max(0, Number(item.calories) || Math.round(protein * 4 + carb * 4 + fat * 9));
  const defaultPortion = Math.max(1, Math.round(Number(item.defaultPortion) || 100));

  return { id, name, type, protein, carb, fat, calories, defaultPortion };
}

async function main() {
  const rawText = await fs.readFile(catalogPath, "utf8");
  const parsed = JSON.parse(rawText);
  const list = Array.isArray(parsed?.items) ? parsed.items : Array.isArray(parsed) ? parsed : [];
  const items = list.map(normalizeItem).filter(Boolean);

  if (!items.length) {
    throw new Error("Seed icin gecerli item bulunamadi.");
  }

  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: process.env.PGSSLMODE === "require" ? { rejectUnauthorized: false } : undefined
  });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    await client.query(`
      CREATE TABLE IF NOT EXISTS foods (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('protein', 'carb', 'fat')),
        protein DOUBLE PRECISION NOT NULL,
        carb DOUBLE PRECISION NOT NULL,
        fat DOUBLE PRECISION NOT NULL,
        calories DOUBLE PRECISION NOT NULL,
        default_portion INTEGER NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    for (const item of items) {
      await client.query(
        `
        INSERT INTO foods (id, name, type, protein, carb, fat, calories, default_portion)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (id)
        DO UPDATE SET
          name = EXCLUDED.name,
          type = EXCLUDED.type,
          protein = EXCLUDED.protein,
          carb = EXCLUDED.carb,
          fat = EXCLUDED.fat,
          calories = EXCLUDED.calories,
          default_portion = EXCLUDED.default_portion
        `,
        [item.id, item.name, item.type, item.protein, item.carb, item.fat, item.calories, item.defaultPortion]
      );
    }

    if (pruneUnknown) {
      const ids = items.map((item) => item.id);
      await client.query("DELETE FROM foods WHERE NOT (id = ANY($1::text[]))", [ids]);
    }

    await client.query("COMMIT");
    console.log(`Foods DB seed tamamlandi: ${items.length} kayit (${pruneUnknown ? "prune acik" : "prune kapali"})`);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error("Foods DB seed basarisiz:", error.message);
  process.exit(1);
});
