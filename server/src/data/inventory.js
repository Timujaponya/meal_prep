import { Pool } from "pg";

const DATABASE_URL = process.env.DATABASE_URL;
const useDatabase = Boolean(DATABASE_URL);
let pool;
let memoryInventory = [];

function getPool() {
  if (!useDatabase) {
    return null;
  }

  if (!pool) {
    const needsSsl = process.env.PGSSLMODE === "require";
    pool = new Pool({
      connectionString: DATABASE_URL,
      ssl: needsSsl ? { rejectUnauthorized: false } : undefined
    });
  }

  return pool;
}

function sanitizeAmount(value) {
  const parsed = Math.round(Number(value));
  if (!Number.isFinite(parsed)) {
    return 0;
  }
  return Math.max(0, Math.min(25000, parsed));
}

export async function initializeInventoryStore() {
  if (!useDatabase) {
    return;
  }

  const db = getPool();
  await db.query(`
    CREATE TABLE IF NOT EXISTS user_inventory (
      user_id TEXT NOT NULL,
      food_id TEXT NOT NULL,
      amount_grams INTEGER NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (user_id, food_id)
    )
  `);
}

export async function listUserInventory(userId) {
  const safeUserId = String(userId || "").trim();
  if (!safeUserId) {
    throw new Error("User bulunamadi.");
  }

  if (!useDatabase) {
    return memoryInventory
      .filter((entry) => entry.userId === safeUserId)
      .map((entry) => ({ foodId: entry.foodId, amountGrams: entry.amountGrams }));
  }

  const db = getPool();
  const result = await db.query(
    "SELECT food_id, amount_grams FROM user_inventory WHERE user_id = $1 ORDER BY food_id ASC",
    [safeUserId]
  );

  return result.rows.map((row) => ({
    foodId: row.food_id,
    amountGrams: Number(row.amount_grams) || 0
  }));
}

export async function getInventoryMap(userId) {
  const entries = await listUserInventory(userId);
  return Object.fromEntries(entries.map((entry) => [entry.foodId, entry.amountGrams]));
}

export async function upsertInventoryItem({ userId, foodId, amountGrams }) {
  const safeUserId = String(userId || "").trim();
  const safeFoodId = String(foodId || "").trim();
  const safeAmount = sanitizeAmount(amountGrams);

  if (!safeUserId || !safeFoodId) {
    throw new Error("Inventory kaydi icin user ve food zorunlu.");
  }

  if (!useDatabase) {
    const index = memoryInventory.findIndex((entry) => entry.userId === safeUserId && entry.foodId === safeFoodId);

    if (safeAmount === 0) {
      if (index >= 0) {
        memoryInventory.splice(index, 1);
      }
      return;
    }

    const next = {
      userId: safeUserId,
      foodId: safeFoodId,
      amountGrams: safeAmount,
      updatedAt: new Date().toISOString()
    };

    if (index >= 0) {
      memoryInventory[index] = next;
    } else {
      memoryInventory.push(next);
    }

    return;
  }

  const db = getPool();

  if (safeAmount === 0) {
    await db.query("DELETE FROM user_inventory WHERE user_id = $1 AND food_id = $2", [safeUserId, safeFoodId]);
    return;
  }

  await db.query(
    `
    INSERT INTO user_inventory (user_id, food_id, amount_grams)
    VALUES ($1, $2, $3)
    ON CONFLICT (user_id, food_id)
    DO UPDATE SET amount_grams = EXCLUDED.amount_grams, updated_at = NOW()
    `,
    [safeUserId, safeFoodId, safeAmount]
  );
}

export async function closeInventoryStore() {
  if (pool) {
    await pool.end();
    pool = undefined;
  }
}