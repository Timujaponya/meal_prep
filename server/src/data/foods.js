import fs from "fs";
import path from "path";
import { Pool } from "pg";
import { fileURLToPath } from "url";

const baseSeedFoodItems = [
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

const generatedCatalogConfig = {
  protein: {
    count: 185,
    bases: [
      "Tavuk But", "Tavuk Kanat", "Hindi Fileto", "Dana Bonfile", "Dana Kontrfile", "Kuzu But", "Kuzu Pirzola",
      "Ton Baligi", "Uskumru", "Levrek", "Corbali Somon", "Karides", "Kalamar", "Midye", "Yumurta Aki",
      "Lor Peyniri", "Yagziz Yogurt", "Kefir", "Soya Filizi", "Tempeh", "Tofu", "Nohut Ezmesi", "Mercimek Ezmesi",
      "Kuru Fasulye", "Barbunya", "Bezelye", "Seitan", "Hindi Jambon", "Pastirma", "Izgara Kofte"
    ]
  },
  carb: {
    count: 170,
    bases: [
      "Bulgur", "Esmer Pirinc", "Yasmin Pirinc", "Basmatik Pirinc", "Karabuğday", "Ince Yulaf", "Kalin Yulaf",
      "Tatli Patates", "Mor Patates", "Kuskus", "Erişte", "Tam Bugday Makarna", "Misir", "Nohut",
      "Yesil Mercimek", "Kirmizi Mercimek", "Kuru Fasulye", "Boreklik Bugday", "Kinoa Kirmizi", "Kinoa Beyaz",
      "Arpa", "Cavdar", "Tam Bugday Ekmek", "Kepekli Ekmek", "Misir Tortilla", "Pancar", "Havuc",
      "Kabak", "Brokoli", "Karnabahar"
    ]
  },
  fat: {
    count: 130,
    bases: [
      "Zeytinyagi Natuel", "Ay Cicek Yagi", "Kanola Yagi", "Hindistan Cevizi Yagi", "Tereyagi", "Ghee",
      "Findik", "Antep Fistigi", "Kaju", "Pekan", "Cia Tohumu", "Keten Tohumu", "Susam", "Tahin", "Cekirdek",
      "Zeytin Siyah", "Zeytin Yesil", "Kaymak", "Krema", "Avokado Yagi", "Badem Ezmesi", "Findik Ezmesi"
    ]
  }
};

const variantLabels = ["Klasik", "Taze", "Organik", "Yerli", "Dogal", "Secim", "Premium", "Gunluk", "Paket", "Mutfak"];

function roundOne(value) {
  return Math.round(value * 10) / 10;
}

function nutritionForType(type, index) {
  if (type === "protein") {
    const protein = roundOne(18 + (index % 17));
    const carb = roundOne((index % 7) * 0.8);
    const fat = roundOne(2 + ((index * 3) % 16));
    return { protein, carb, fat, defaultPortion: 90 + (index % 6) * 15 };
  }

  if (type === "carb") {
    const protein = roundOne(1 + (index % 8) * 1.2);
    const carb = roundOne(15 + ((index * 5) % 61));
    const fat = roundOne(((index * 2) % 9) * 0.5);
    return { protein, carb, fat, defaultPortion: 120 + (index % 7) * 18 };
  }

  const protein = roundOne(((index * 3) % 13) * 0.8);
  const carb = roundOne(((index * 5) % 11) * 0.7);
  const fat = roundOne(20 + ((index * 7) % 81));
  return { protein, carb, fat, defaultPortion: 18 + (index % 6) * 8 };
}

function buildGeneratedFoodsByType(type, config) {
  const items = [];

  for (let index = 0; index < config.count; index += 1) {
    const base = config.bases[index % config.bases.length];
    const variant = variantLabels[Math.floor(index / config.bases.length) % variantLabels.length];
    const sequence = String(index + 1).padStart(3, "0");
    const nutrition = nutritionForType(type, index);
    const calories = Math.round(nutrition.protein * 4 + nutrition.carb * 4 + nutrition.fat * 9);

    items.push({
      id: `${type}_catalog_${sequence}`,
      name: `${base} ${variant} ${sequence}`,
      type,
      protein: nutrition.protein,
      carb: nutrition.carb,
      fat: nutrition.fat,
      calories,
      defaultPortion: nutrition.defaultPortion
    });
  }

  return items;
}

const generatedSeedFoodItems = [
  ...buildGeneratedFoodsByType("protein", generatedCatalogConfig.protein),
  ...buildGeneratedFoodsByType("carb", generatedCatalogConfig.carb),
  ...buildGeneratedFoodsByType("fat", generatedCatalogConfig.fat)
];

const currentFilePath = fileURLToPath(import.meta.url);
const currentDirPath = path.dirname(currentFilePath);
const defaultCatalogPath = path.resolve(currentDirPath, "catalog", "foods.usda.json");

function normalizeCatalogItem(item) {
  if (!item || typeof item !== "object") {
    return null;
  }

  const id = String(item.id || "").trim();
  const name = String(item.name || "").trim();
  const type = String(item.type || "").trim();
  const validTypes = new Set(["protein", "carb", "fat"]);

  if (!id || !name || !validTypes.has(type)) {
    return null;
  }

  const protein = Math.max(0, Number(item.protein) || 0);
  const carb = Math.max(0, Number(item.carb) || 0);
  const fat = Math.max(0, Number(item.fat) || 0);
  const caloriesFromMacros = protein * 4 + carb * 4 + fat * 9;
  const calories = Math.max(0, Number(item.calories) || Math.round(caloriesFromMacros));
  const defaultPortion = Math.max(1, Math.round(Number(item.defaultPortion) || 100));

  return {
    id,
    name,
    type,
    protein: Math.round(protein * 10) / 10,
    carb: Math.round(carb * 10) / 10,
    fat: Math.round(fat * 10) / 10,
    calories: Math.round(calories),
    defaultPortion
  };
}

function loadExternalCatalogItems() {
  const catalogPath = process.env.FOOD_CATALOG_PATH || defaultCatalogPath;
  if (!fs.existsSync(catalogPath)) {
    return [];
  }

  try {
    const raw = fs.readFileSync(catalogPath, "utf8");
    const parsed = JSON.parse(raw);
    const records = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.items) ? parsed.items : [];

    return records.map(normalizeCatalogItem).filter(Boolean);
  } catch (error) {
    console.warn(`Food catalog dosyasi okunamadi (${catalogPath}):`, error.message);
    return [];
  }
}

function withCoreFallback(catalogItems) {
  const byId = new Map(catalogItems.map((item) => [item.id, item]));

  for (const core of baseSeedFoodItems) {
    if (!byId.has(core.id)) {
      byId.set(core.id, core);
    }
  }

  return Array.from(byId.values());
}

const externalCatalogItems = loadExternalCatalogItems();
const seedFoodItems = externalCatalogItems.length
  ? withCoreFallback(externalCatalogItems)
  : [...baseSeedFoodItems, ...generatedSeedFoodItems];

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

  const seedIds = seedFoodItems.map((seed) => seed.id);
  const existingRows = await db.query("SELECT id FROM foods WHERE id = ANY($1::text[])", [seedIds]);
  const existingIds = new Set(existingRows.rows.map((row) => row.id));

  for (const seed of seedFoodItems) {
    if (existingIds.has(seed.id)) {
      continue;
    }

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

export async function updateFoodItem(foodId, payload) {
  const safeFoodId = String(foodId || "").trim();
  if (!safeFoodId) {
    throw new Error("Guncellenecek malzeme bulunamadi.");
  }

  const normalized = validatePayload(payload);

  if (!useDatabase) {
    const index = memoryFoods.findIndex((item) => item.id === safeFoodId);
    if (index === -1) {
      throw new Error("Guncellenecek malzeme bulunamadi.");
    }

    const updated = {
      ...memoryFoods[index],
      ...normalized,
      id: safeFoodId
    };

    memoryFoods[index] = updated;
    return updated;
  }

  const db = getPool();
  const result = await db.query(
    `
    UPDATE foods
    SET name = $2,
        type = $3,
        protein = $4,
        carb = $5,
        fat = $6,
        calories = $7,
        default_portion = $8
    WHERE id = $1
    RETURNING *
    `,
    [
      safeFoodId,
      normalized.name,
      normalized.type,
      normalized.protein,
      normalized.carb,
      normalized.fat,
      normalized.calories,
      normalized.defaultPortion
    ]
  );

  if (!result.rowCount) {
    throw new Error("Guncellenecek malzeme bulunamadi.");
  }

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
