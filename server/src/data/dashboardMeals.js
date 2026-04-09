import crypto from "crypto";
import { Pool } from "pg";

const DATABASE_URL = process.env.DATABASE_URL;
const useDatabase = Boolean(DATABASE_URL);

let pool;
let memoryDashboardMeals = [];

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

function sanitizeNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed * 10) / 10) : 0;
}

function sanitizeImage(value) {
  const raw = String(value || "").trim();
  if (!raw) {
    return "https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=1200&q=80";
  }
  return raw;
}

function validatePayload(payload = {}) {
  const title = String(payload.title || "").trim();
  if (!title) {
    throw new Error("Yemek basligi zorunludur.");
  }

  return {
    title,
    calories: sanitizeNumber(payload.calories),
    protein: sanitizeNumber(payload.protein),
    carb: sanitizeNumber(payload.carb),
    fat: sanitizeNumber(payload.fat),
    image: sanitizeImage(payload.image)
  };
}

function fromRow(row) {
  return {
    id: row.id,
    title: row.title,
    calories: Number(row.calories) || 0,
    protein: Number(row.protein) || 0,
    carb: Number(row.carb) || 0,
    fat: Number(row.fat) || 0,
    image: row.image || "",
    createdAt: row.created_at
  };
}

function assertUser(userId) {
  const safeUserId = String(userId || "").trim();
  if (!safeUserId) {
    throw new Error("User bulunamadi.");
  }
  return safeUserId;
}

export async function initializeDashboardMealStore() {
  if (!useDatabase) {
    return;
  }

  const db = getPool();
  await db.query(`
    CREATE TABLE IF NOT EXISTS dashboard_meals (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      calories DOUBLE PRECISION NOT NULL,
      protein DOUBLE PRECISION NOT NULL,
      carb DOUBLE PRECISION NOT NULL,
      fat DOUBLE PRECISION NOT NULL,
      image TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

export async function listDashboardMeals(userId) {
  const safeUserId = assertUser(userId);

  if (!useDatabase) {
    return memoryDashboardMeals
      .filter((entry) => entry.userId === safeUserId)
      .map((entry) => ({ ...entry }))
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  }

  const db = getPool();
  const result = await db.query(
    "SELECT * FROM dashboard_meals WHERE user_id = $1 ORDER BY created_at DESC",
    [safeUserId]
  );

  return result.rows.map(fromRow);
}

export async function createDashboardMeal(userId, payload) {
  const safeUserId = assertUser(userId);
  const normalized = validatePayload(payload);
  const nextId = crypto.randomUUID();

  if (!useDatabase) {
    const next = {
      id: nextId,
      userId: safeUserId,
      ...normalized,
      createdAt: new Date().toISOString()
    };
    memoryDashboardMeals.push(next);
    return { ...next };
  }

  const db = getPool();
  const result = await db.query(
    `
    INSERT INTO dashboard_meals (id, user_id, title, calories, protein, carb, fat, image)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *
    `,
    [
      nextId,
      safeUserId,
      normalized.title,
      normalized.calories,
      normalized.protein,
      normalized.carb,
      normalized.fat,
      normalized.image
    ]
  );

  return fromRow(result.rows[0]);
}

export async function updateDashboardMeal(userId, mealId, payload) {
  const safeUserId = assertUser(userId);
  const safeMealId = String(mealId || "").trim();
  if (!safeMealId) {
    throw new Error("Guncellenecek yemek bulunamadi.");
  }

  const normalized = validatePayload(payload);

  if (!useDatabase) {
    const index = memoryDashboardMeals.findIndex((entry) => entry.id === safeMealId && entry.userId === safeUserId);
    if (index === -1) {
      throw new Error("Guncellenecek yemek bulunamadi.");
    }

    const updated = {
      ...memoryDashboardMeals[index],
      ...normalized
    };
    memoryDashboardMeals[index] = updated;
    return { ...updated };
  }

  const db = getPool();
  const result = await db.query(
    `
    UPDATE dashboard_meals
    SET title = $3,
        calories = $4,
        protein = $5,
        carb = $6,
        fat = $7,
        image = $8,
        updated_at = NOW()
    WHERE id = $1 AND user_id = $2
    RETURNING *
    `,
    [
      safeMealId,
      safeUserId,
      normalized.title,
      normalized.calories,
      normalized.protein,
      normalized.carb,
      normalized.fat,
      normalized.image
    ]
  );

  if (!result.rowCount) {
    throw new Error("Guncellenecek yemek bulunamadi.");
  }

  return fromRow(result.rows[0]);
}

export async function deleteDashboardMeal(userId, mealId) {
  const safeUserId = assertUser(userId);
  const safeMealId = String(mealId || "").trim();
  if (!safeMealId) {
    throw new Error("Silinecek yemek bulunamadi.");
  }

  if (!useDatabase) {
    const index = memoryDashboardMeals.findIndex((entry) => entry.id === safeMealId && entry.userId === safeUserId);
    if (index === -1) {
      throw new Error("Silinecek yemek bulunamadi.");
    }

    const [removed] = memoryDashboardMeals.splice(index, 1);
    return { ...removed };
  }

  const db = getPool();
  const result = await db.query(
    "DELETE FROM dashboard_meals WHERE id = $1 AND user_id = $2 RETURNING *",
    [safeMealId, safeUserId]
  );

  if (!result.rowCount) {
    throw new Error("Silinecek yemek bulunamadi.");
  }

  return fromRow(result.rows[0]);
}

export async function closeDashboardMealStore() {
  if (pool) {
    await pool.end();
    pool = undefined;
  }
}
