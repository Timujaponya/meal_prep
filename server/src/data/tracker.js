import { Pool } from "pg";

const DATABASE_URL = process.env.DATABASE_URL;
const useDatabase = Boolean(DATABASE_URL);

let pool;
let memoryMealLogs = [];
let memoryWaterLogs = [];

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

function asDateString(input) {
  if (typeof input === "string" && /^\d{4}-\d{2}-\d{2}$/.test(input.trim())) {
    return input.trim();
  }

  const date = input ? new Date(input) : new Date();
  if (Number.isNaN(date.getTime())) {
    throw new Error("Gecersiz tarih gonderildi.");
  }

  return date.toISOString().slice(0, 10);
}

function sanitizeEntry(item) {
  const quantity = Math.max(1, Math.round(Number(item?.qty) || 1));
  const calories = Math.max(0, Number(item?.calories) || 0) * quantity;
  const protein = Math.max(0, Number(item?.protein) || 0) * quantity;
  const carb = Math.max(0, Number(item?.carb) || 0) * quantity;
  const fat = Math.max(0, Number(item?.fat) || 0) * quantity;

  return {
    sourceId: String(item?.id || "meal_unknown"),
    title: String(item?.title || "Meal"),
    quantity,
    calories,
    protein,
    carb,
    fat,
    ingredientIds: Array.isArray(item?.ingredientIds) ? item.ingredientIds.map((value) => String(value)) : []
  };
}

function summarizeEntries(entries) {
  const totals = entries.reduce(
    (acc, item) => {
      acc.calories += item.calories;
      acc.protein += item.protein;
      acc.carb += item.carb;
      acc.fat += item.fat;
      return acc;
    },
    { calories: 0, protein: 0, carb: 0, fat: 0 }
  );

  return {
    calories: Math.round(totals.calories),
    protein: Math.round(totals.protein * 10) / 10,
    carb: Math.round(totals.carb * 10) / 10,
    fat: Math.round(totals.fat * 10) / 10
  };
}

function aggregateRows(rows) {
  const grouped = new Map();

  for (const row of rows) {
    const key = `${row.sourceId}__${row.title}`;
    const current = grouped.get(key);

    if (!current) {
      grouped.set(key, {
        sourceId: row.sourceId,
        title: row.title,
        quantity: row.quantity,
        calories: row.calories,
        protein: row.protein,
        carb: row.carb,
        fat: row.fat,
        ingredientIds: new Set(row.ingredientIds || [])
      });
      continue;
    }

    current.quantity += row.quantity;
    current.calories += row.calories;
    current.protein += row.protein;
    current.carb += row.carb;
    current.fat += row.fat;
    for (const id of row.ingredientIds || []) {
      current.ingredientIds.add(id);
    }
  }

  return Array.from(grouped.values()).map((entry) => ({
    sourceId: entry.sourceId,
    title: entry.title,
    quantity: entry.quantity,
    calories: Math.round(entry.calories),
    protein: Math.round(entry.protein * 10) / 10,
    carb: Math.round(entry.carb * 10) / 10,
    fat: Math.round(entry.fat * 10) / 10,
    ingredientIds: Array.from(entry.ingredientIds)
  }));
}

export async function initializeTrackerStore() {
  if (!useDatabase) {
    return;
  }

  const db = getPool();

  await db.query(`
    CREATE TABLE IF NOT EXISTS meal_logs (
      id BIGSERIAL PRIMARY KEY,
      user_id TEXT NOT NULL,
      entry_date DATE NOT NULL,
      source_id TEXT NOT NULL,
      title TEXT NOT NULL,
      quantity INTEGER NOT NULL CHECK (quantity > 0),
      calories DOUBLE PRECISION NOT NULL,
      protein DOUBLE PRECISION NOT NULL,
      carb DOUBLE PRECISION NOT NULL,
      fat DOUBLE PRECISION NOT NULL,
      ingredient_ids TEXT[] NOT NULL DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await db.query("ALTER TABLE meal_logs ADD COLUMN IF NOT EXISTS user_id TEXT NOT NULL DEFAULT 'admin_1'");

  await db.query(`
    CREATE TABLE IF NOT EXISTS water_logs (
      id BIGSERIAL PRIMARY KEY,
      user_id TEXT NOT NULL,
      entry_date DATE NOT NULL,
      amount_ml INTEGER NOT NULL CHECK (amount_ml > 0),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await db.query("ALTER TABLE water_logs ADD COLUMN IF NOT EXISTS user_id TEXT NOT NULL DEFAULT 'admin_1'");
}

export async function appendMealLog({ userId, date, items }) {
  const safeUserId = String(userId || "").trim();
  if (!safeUserId) {
    throw new Error("User bulunamadi.");
  }

  const entryDate = asDateString(date);
  const normalizedItems = Array.isArray(items) ? items.map(sanitizeEntry).filter((item) => item.calories > 0) : [];

  if (!normalizedItems.length) {
    throw new Error("Kayit icin gecerli ogun bulunamadi.");
  }

  if (!useDatabase) {
    for (const item of normalizedItems) {
      memoryMealLogs.push({ userId: safeUserId, entryDate, ...item, createdAt: new Date().toISOString() });
    }
    return;
  }

  const db = getPool();
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    for (const item of normalizedItems) {
      await client.query(
        `
        INSERT INTO meal_logs (user_id, entry_date, source_id, title, quantity, calories, protein, carb, fat, ingredient_ids)
        VALUES ($1, $2::date, $3, $4, $5, $6, $7, $8, $9, $10::text[])
        `,
        [
          safeUserId,
          entryDate,
          item.sourceId,
          item.title,
          item.quantity,
          item.calories,
          item.protein,
          item.carb,
          item.fat,
          item.ingredientIds
        ]
      );
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function getDailyMealLog({ userId, date }) {
  const safeUserId = String(userId || "").trim();
  if (!safeUserId) {
    throw new Error("User bulunamadi.");
  }

  const entryDate = asDateString(date);

  let rows;

  if (!useDatabase) {
    rows = memoryMealLogs
      .filter((row) => row.userId === safeUserId && row.entryDate === entryDate)
      .map((row) => ({
        sourceId: row.sourceId,
        title: row.title,
        quantity: row.quantity,
        calories: row.calories,
        protein: row.protein,
        carb: row.carb,
        fat: row.fat,
        ingredientIds: row.ingredientIds
      }));
  } else {
    const db = getPool();
    const result = await db.query(
      `
      SELECT source_id, title, quantity, calories, protein, carb, fat, ingredient_ids
      FROM meal_logs
      WHERE user_id = $1 AND entry_date = $2::date
      ORDER BY title ASC, created_at ASC
      `,
      [safeUserId, entryDate]
    );

    rows = result.rows.map((row) => ({
      sourceId: row.source_id,
      title: row.title,
      quantity: Number(row.quantity) || 0,
      calories: Number(row.calories) || 0,
      protein: Number(row.protein) || 0,
      carb: Number(row.carb) || 0,
      fat: Number(row.fat) || 0,
      ingredientIds: Array.isArray(row.ingredient_ids) ? row.ingredient_ids : []
    }));
  }

  const entries = aggregateRows(rows);
  const totals = summarizeEntries(entries);

  return {
    date: entryDate,
    entries,
    totals
  };
}

export async function deleteMealLogBySource({ userId, date, sourceId }) {
  const safeUserId = String(userId || "").trim();
  if (!safeUserId) {
    throw new Error("User bulunamadi.");
  }

  const entryDate = asDateString(date);
  const safeSourceId = String(sourceId || "").trim();
  if (!safeSourceId) {
    throw new Error("Silinecek kayit bulunamadi.");
  }

  if (!useDatabase) {
    const before = memoryMealLogs.length;
    memoryMealLogs = memoryMealLogs.filter(
      (row) => !(row.userId === safeUserId && row.entryDate === entryDate && row.sourceId === safeSourceId)
    );

    if (before === memoryMealLogs.length) {
      throw new Error("Silinecek kayit bulunamadi.");
    }

    return;
  }

  const db = getPool();
  const result = await db.query(
    "DELETE FROM meal_logs WHERE user_id = $1 AND entry_date = $2::date AND source_id = $3",
    [safeUserId, entryDate, safeSourceId]
  );

  if (!result.rowCount) {
    throw new Error("Silinecek kayit bulunamadi.");
  }
}

export async function replaceMealLogBySource({ userId, date, sourceId, entry = {} }) {
  const safeUserId = String(userId || "").trim();
  if (!safeUserId) {
    throw new Error("User bulunamadi.");
  }

  const entryDate = asDateString(date);
  const safeSourceId = String(sourceId || "").trim();

  if (!safeSourceId) {
    throw new Error("Guncellenecek kayit bulunamadi.");
  }

  const dayLog = await getDailyMealLog({ userId: safeUserId, date: entryDate });
  const current = dayLog.entries.find((entry) => entry.sourceId === safeSourceId);

  if (!current) {
    throw new Error("Guncellenecek kayit bulunamadi.");
  }

  const baseQuantity = Math.max(1, Number(current.quantity) || 1);
  const caloriesPerUnit = Number(current.calories) / baseQuantity;
  const proteinPerUnit = Number(current.protein) / baseQuantity;
  const carbPerUnit = Number(current.carb) / baseQuantity;
  const fatPerUnit = Number(current.fat) / baseQuantity;

  const safeQuantity = Math.max(1, Math.round(Number(entry.quantity) || baseQuantity));
  const safeTitle = String(entry.title || "").trim() || current.title;
  const safeCaloriesPerUnit = Math.max(0, Number(entry.calories));
  const safeProteinPerUnit = Math.max(0, Number(entry.protein));
  const safeCarbPerUnit = Math.max(0, Number(entry.carb));
  const safeFatPerUnit = Math.max(0, Number(entry.fat));

  const resolvedCaloriesPerUnit = Number.isFinite(safeCaloriesPerUnit) ? safeCaloriesPerUnit : caloriesPerUnit;
  const resolvedProteinPerUnit = Number.isFinite(safeProteinPerUnit) ? safeProteinPerUnit : proteinPerUnit;
  const resolvedCarbPerUnit = Number.isFinite(safeCarbPerUnit) ? safeCarbPerUnit : carbPerUnit;
  const resolvedFatPerUnit = Number.isFinite(safeFatPerUnit) ? safeFatPerUnit : fatPerUnit;

  const nextRow = {
    userId: safeUserId,
    entryDate,
    sourceId: safeSourceId,
    title: safeTitle,
    quantity: safeQuantity,
    calories: Math.max(0, resolvedCaloriesPerUnit * safeQuantity),
    protein: Math.max(0, resolvedProteinPerUnit * safeQuantity),
    carb: Math.max(0, resolvedCarbPerUnit * safeQuantity),
    fat: Math.max(0, resolvedFatPerUnit * safeQuantity),
    ingredientIds: Array.isArray(current.ingredientIds) ? current.ingredientIds : []
  };

  if (!useDatabase) {
    memoryMealLogs = memoryMealLogs.filter(
      (row) => !(row.userId === safeUserId && row.entryDate === entryDate && row.sourceId === safeSourceId)
    );

    memoryMealLogs.push({
      ...nextRow,
      createdAt: new Date().toISOString()
    });

    return;
  }

  const db = getPool();
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    await client.query(
      "DELETE FROM meal_logs WHERE user_id = $1 AND entry_date = $2::date AND source_id = $3",
      [safeUserId, entryDate, safeSourceId]
    );

    await client.query(
      `
      INSERT INTO meal_logs (user_id, entry_date, source_id, title, quantity, calories, protein, carb, fat, ingredient_ids)
      VALUES ($1, $2::date, $3, $4, $5, $6, $7, $8, $9, $10::text[])
      `,
      [
        nextRow.userId,
        nextRow.entryDate,
        nextRow.sourceId,
        nextRow.title,
        nextRow.quantity,
        nextRow.calories,
        nextRow.protein,
        nextRow.carb,
        nextRow.fat,
        nextRow.ingredientIds
      ]
    );

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function appendWaterLog({ userId, date, amountMl }) {
  const safeUserId = String(userId || "").trim();
  if (!safeUserId) {
    throw new Error("User bulunamadi.");
  }

  const entryDate = asDateString(date);
  const parsedAmount = Math.round(Number(amountMl));
  if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
    throw new Error("Su miktari gecersiz.");
  }

  const safeAmount = Math.max(50, Math.min(2000, parsedAmount));

  if (!useDatabase) {
    memoryWaterLogs.push({ userId: safeUserId, entryDate, amountMl: safeAmount, createdAt: new Date().toISOString() });
    return;
  }

  const db = getPool();
  await db.query(
    `
    INSERT INTO water_logs (user_id, entry_date, amount_ml)
    VALUES ($1, $2::date, $3)
    `,
    [safeUserId, entryDate, safeAmount]
  );
}

export async function getDailyWaterStatus({ userId, date, targetMl }) {
  const safeUserId = String(userId || "").trim();
  if (!safeUserId) {
    throw new Error("User bulunamadi.");
  }

  const entryDate = asDateString(date);
  const safeTarget = Math.max(1200, Math.min(5000, Math.round(Number(targetMl) || 2800)));

  let totalMl;

  if (!useDatabase) {
    totalMl = memoryWaterLogs
      .filter((row) => row.userId === safeUserId && row.entryDate === entryDate)
      .reduce((acc, row) => acc + row.amountMl, 0);
  } else {
    const db = getPool();
    const result = await db.query(
      "SELECT COALESCE(SUM(amount_ml), 0)::int AS total_ml FROM water_logs WHERE user_id = $1 AND entry_date = $2::date",
      [safeUserId, entryDate]
    );
    totalMl = Number(result.rows[0]?.total_ml || 0);
  }

  const progress = Math.max(0, Math.min(1, totalMl / Math.max(1, safeTarget)));

  return {
    date: entryDate,
    totalMl,
    targetMl: safeTarget,
    remainingMl: Math.max(0, safeTarget - totalMl),
    progress: Math.round(progress * 1000) / 1000
  };
}

export async function closeTrackerStore() {
  if (pool) {
    await pool.end();
    pool = undefined;
  }
}