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

function normalizeAmount(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return {
      appliedAmount: 0,
      clamped: true
    };
  }

  const rounded = Math.round(parsed * 10) / 10;
  const appliedAmount = Math.max(0, Math.min(25000, rounded));

  return {
    appliedAmount,
    clamped: appliedAmount !== parsed
  };
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
      amount_grams DOUBLE PRECISION NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (user_id, food_id)
    )
  `);

  await db.query(`
    ALTER TABLE user_inventory
    ALTER COLUMN amount_grams TYPE DOUBLE PRECISION
    USING amount_grams::double precision
  `);

  await db.query("DELETE FROM user_inventory WHERE food_id NOT IN (SELECT id FROM foods)");

  await db.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'user_inventory_food_fk'
      ) THEN
        ALTER TABLE user_inventory
          ADD CONSTRAINT user_inventory_food_fk
          FOREIGN KEY (food_id)
          REFERENCES foods(id)
          ON DELETE CASCADE;
      END IF;
    END
    $$
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
  const adjustment = normalizeAmount(amountGrams);
  const safeAmount = adjustment.appliedAmount;

  if (!safeUserId || !safeFoodId) {
    throw new Error("Inventory kaydi icin user ve food zorunlu.");
  }

  if (!useDatabase) {
    const index = memoryInventory.findIndex((entry) => entry.userId === safeUserId && entry.foodId === safeFoodId);

    if (safeAmount === 0) {
      if (index >= 0) {
        memoryInventory.splice(index, 1);
      }
      return {
        appliedAmountGrams: 0,
        clamped: adjustment.clamped
      };
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

    return {
      appliedAmountGrams: safeAmount,
      clamped: adjustment.clamped
    };
  }

  const db = getPool();

  if (safeAmount === 0) {
    await db.query("DELETE FROM user_inventory WHERE user_id = $1 AND food_id = $2", [safeUserId, safeFoodId]);
    return {
      appliedAmountGrams: 0,
      clamped: adjustment.clamped
    };
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

  return {
    appliedAmountGrams: safeAmount,
    clamped: adjustment.clamped
  };
}

export async function incrementInventoryItem({ userId, foodId, deltaGrams }) {
  const safeUserId = String(userId || "").trim();
  const safeFoodId = String(foodId || "").trim();
  const rawDelta = Number(deltaGrams);

  if (!safeUserId || !safeFoodId) {
    throw new Error("Inventory kaydi icin user ve food zorunlu.");
  }

  if (!Number.isFinite(rawDelta)) {
    throw new Error("Gecersiz inventory artisi.");
  }

  const roundedDelta = Math.round(rawDelta * 10) / 10;

  if (!useDatabase) {
    const index = memoryInventory.findIndex((entry) => entry.userId === safeUserId && entry.foodId === safeFoodId);
    const current = index >= 0 ? Number(memoryInventory[index].amountGrams) || 0 : 0;
    const unclampedNext = Math.round((current + roundedDelta) * 10) / 10;
    const next = Math.max(0, Math.min(25000, unclampedNext));
    const clamped = next !== unclampedNext || roundedDelta !== rawDelta;

    if (next === 0) {
      if (index >= 0) {
        memoryInventory.splice(index, 1);
      }
      return { appliedAmountGrams: 0, clamped };
    }

    const row = {
      userId: safeUserId,
      foodId: safeFoodId,
      amountGrams: next,
      updatedAt: new Date().toISOString()
    };

    if (index >= 0) {
      memoryInventory[index] = row;
    } else {
      memoryInventory.push(row);
    }

    return { appliedAmountGrams: next, clamped };
  }

  const db = getPool();
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const currentResult = await client.query(
      "SELECT amount_grams FROM user_inventory WHERE user_id = $1 AND food_id = $2 FOR UPDATE",
      [safeUserId, safeFoodId]
    );

    const current = Number(currentResult.rows[0]?.amount_grams || 0);
    const unclampedNext = Math.round((current + roundedDelta) * 10) / 10;
    const next = Math.max(0, Math.min(25000, unclampedNext));
    const clamped = next !== unclampedNext || roundedDelta !== rawDelta;

    if (next === 0) {
      await client.query("DELETE FROM user_inventory WHERE user_id = $1 AND food_id = $2", [safeUserId, safeFoodId]);
      await client.query("COMMIT");
      return { appliedAmountGrams: 0, clamped };
    }

    await client.query(
      `
      INSERT INTO user_inventory (user_id, food_id, amount_grams)
      VALUES ($1, $2, $3)
      ON CONFLICT (user_id, food_id)
      DO UPDATE SET amount_grams = EXCLUDED.amount_grams, updated_at = NOW()
      `,
      [safeUserId, safeFoodId, next]
    );

    await client.query("COMMIT");
    return { appliedAmountGrams: next, clamped };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function deleteInventoryRowsByFoodId(foodId) {
  const safeFoodId = String(foodId || "").trim();
  if (!safeFoodId) {
    return;
  }

  if (!useDatabase) {
    memoryInventory = memoryInventory.filter((entry) => entry.foodId !== safeFoodId);
    return;
  }

  const db = getPool();
  await db.query("DELETE FROM user_inventory WHERE food_id = $1", [safeFoodId]);
}

export async function closeInventoryStore() {
  if (pool) {
    await pool.end();
    pool = undefined;
  }
}