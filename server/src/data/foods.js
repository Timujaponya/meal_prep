import { Pool } from "pg";

const seedFoodItems = [
  { id: "chicken", name: "Tavuk Gogus", type: "protein", protein: 31, carb: 0, fat: 3.6, calories: 165, defaultPortion: 120 },
  { id: "turkey", name: "Hindi", type: "protein", protein: 29, carb: 0, fat: 1.5, calories: 135, defaultPortion: 120 },
  { id: "beef_lean", name: "Yagsiz Dana", type: "protein", protein: 26, carb: 0, fat: 10, calories: 210, defaultPortion: 110 },
  { id: "salmon", name: "Somon", type: "protein", protein: 24, carb: 0, fat: 13, calories: 208, defaultPortion: 120 },
  { id: "egg", name: "Yumurta", type: "protein", protein: 13, carb: 1.1, fat: 11, calories: 155, defaultPortion: 100 },

  { id: "rice", name: "Pirinç", type: "carb", protein: 2.7, carb: 28, fat: 0.3, calories: 130, defaultPortion: 160 },
  { id: "oats", name: "Yulaf", type: "carb", protein: 13, carb: 68, fat: 7, calories: 389, defaultPortion: 80 },
  { id: "potato", name: "Patates", type: "carb", protein: 2, carb: 17, fat: 0.1, calories: 77, defaultPortion: 220 },
  { id: "pasta", name: "Makarna", type: "carb", protein: 5.8, carb: 31, fat: 1.1, calories: 158, defaultPortion: 150 },
  { id: "quinoa", name: "Kinoa", type: "carb", protein: 4.4, carb: 21, fat: 1.9, calories: 120, defaultPortion: 150 },

  { id: "olive_oil", name: "Zeytinyagi", type: "fat", protein: 0, carb: 0, fat: 100, calories: 884, defaultPortion: 12 },
  { id: "avocado", name: "Avokado", type: "fat", protein: 2, carb: 9, fat: 15, calories: 160, defaultPortion: 70 },
  { id: "almond", name: "Badem", type: "fat", protein: 21, carb: 22, fat: 50, calories: 579, defaultPortion: 28 },
  { id: "peanut_butter", name: "Fistik Ezmesi", type: "fat", protein: 25, carb: 20, fat: 50, calories: 588, defaultPortion: 24 },
  { id: "walnut", name: "Ceviz", type: "fat", protein: 15, carb: 14, fat: 65, calories: 654, defaultPortion: 20 }
];

const DATABASE_URL = process.env.DATABASE_URL;
const useDatabase = Boolean(DATABASE_URL);
let memoryFoods = [...seedFoodItems];
let pool;

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

export function isDatabaseEnabled() {
  return useDatabase;
}

function toDbRow(item) {
  return [item.id, item.name, item.type, item.protein, item.carb, item.fat, item.calories, item.defaultPortion];
}

function fromDbRow(row) {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    protein: Number(row.protein),
    carb: Number(row.carb),
    fat: Number(row.fat),
    calories: Number(row.calories),
    defaultPortion: Number(row.default_portion)
  };
}

export async function initializeFoodStore() {
  if (!useDatabase) {
    return;
  }

  const db = getPool();

  await db.query(`
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

  const countResult = await db.query("SELECT COUNT(*)::int AS count FROM foods");
  if (countResult.rows[0].count > 0) {
    return;
  }

  for (const seed of seedFoodItems) {
    await db.query(
      `
      INSERT INTO foods (id, name, type, protein, carb, fat, calories, default_portion)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (id) DO NOTHING
      `,
      toDbRow(seed)
    );
  }
}

function slugifyName(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s_-]/g, "")
    .replace(/\s+/g, "_");
}

function sanitizeNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

function validatePayload(payload) {
  const validTypes = ["protein", "carb", "fat"];
  const name = String(payload?.name || "").trim();
  const type = String(payload?.type || "").trim();

  if (!name) {
    throw new Error("Malzeme adi zorunludur.");
  }

  if (!validTypes.includes(type)) {
    throw new Error("Malzeme tipi protein, carb veya fat olmalidir.");
  }

  const protein = sanitizeNumber(payload?.protein);
  const carb = sanitizeNumber(payload?.carb);
  const fat = sanitizeNumber(payload?.fat);
  const defaultPortion = Math.max(1, Math.round(sanitizeNumber(payload?.defaultPortion || 100)));
  const calculatedCalories = protein * 4 + carb * 4 + fat * 9;
  const calories = sanitizeNumber(payload?.calories) || Math.round(calculatedCalories);

  return {
    name,
    type,
    protein,
    carb,
    fat,
    calories,
    defaultPortion
  };
}

async function buildUniqueId(name, idExists) {
  const base = slugifyName(name) || "food";
  if (!(await idExists(base))) {
    return base;
  }

  let index = 2;
  while (await idExists(`${base}_${index}`)) {
    index += 1;
  }

  return `${base}_${index}`;
}

export async function listFoods() {
  if (!useDatabase) {
    return [...memoryFoods];
  }

  const db = getPool();
  const result = await db.query("SELECT * FROM foods ORDER BY created_at ASC, name ASC");
  return result.rows.map(fromDbRow);
}

export async function getFoodsByIds(foodIds) {
  if (!Array.isArray(foodIds) || !foodIds.length) {
    return [];
  }

  if (!useDatabase) {
    return memoryFoods.filter((item) => foodIds.includes(item.id));
  }

  const db = getPool();
  const result = await db.query("SELECT * FROM foods WHERE id = ANY($1::text[])", [foodIds]);
  return result.rows.map(fromDbRow);
}

export async function createFoodItem(payload) {
  const normalized = validatePayload(payload);

  if (!useDatabase) {
    const nextItem = {
      ...normalized,
      id: await buildUniqueId(normalized.name, async (candidateId) =>
        memoryFoods.some((item) => item.id === candidateId)
      )
    };

    memoryFoods.push(nextItem);
    return nextItem;
  }

  const db = getPool();
  const id = await buildUniqueId(normalized.name, async (candidateId) => {
    const result = await db.query("SELECT 1 FROM foods WHERE id = $1", [candidateId]);
    return result.rowCount > 0;
  });

  const result = await db.query(
    `
    INSERT INTO foods (id, name, type, protein, carb, fat, calories, default_portion)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *
    `,
    [
      id,
      normalized.name,
      normalized.type,
      normalized.protein,
      normalized.carb,
      normalized.fat,
      normalized.calories,
      normalized.defaultPortion
    ]
  );

  return fromDbRow(result.rows[0]);
}

export async function removeFoodItemById(foodId) {
  if (!useDatabase) {
    const index = memoryFoods.findIndex((item) => item.id === foodId);
    if (index === -1) {
      throw new Error("Silinecek malzeme bulunamadi.");
    }

    const itemToRemove = memoryFoods[index];
    const sameTypeCount = memoryFoods.filter((item) => item.type === itemToRemove.type).length;
    if (sameTypeCount <= 1) {
      throw new Error("Son kalan kategori malzemesi silinemez.");
    }

    memoryFoods.splice(index, 1);
    return itemToRemove;
  }

  const db = getPool();
  const lookup = await db.query("SELECT id, type FROM foods WHERE id = $1", [foodId]);
  if (!lookup.rowCount) {
    throw new Error("Silinecek malzeme bulunamadi.");
  }

  const foodType = lookup.rows[0].type;
  const sameTypeCountResult = await db.query("SELECT COUNT(*)::int AS count FROM foods WHERE type = $1", [
    foodType
  ]);
  if (sameTypeCountResult.rows[0].count <= 1) {
    throw new Error("Son kalan kategori malzemesi silinemez.");
  }

  const removedResult = await db.query("DELETE FROM foods WHERE id = $1 RETURNING *", [foodId]);
  return fromDbRow(removedResult.rows[0]);
}

export async function closeFoodStore() {
  if (pool) {
    await pool.end();
    pool = undefined;
  }
}
