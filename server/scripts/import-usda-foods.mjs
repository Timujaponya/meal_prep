import "dotenv/config";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const API_BASE = "https://api.nal.usda.gov/fdc/v1/foods/search";
const USDA_API_KEY = process.env.USDA_API_KEY;
const TARGET_COUNT = Math.max(50, Number(process.env.USDA_TARGET_COUNT) || 500);

if (!USDA_API_KEY) {
  console.error("USDA_API_KEY gerekli. Ornek: USDA_API_KEY=xxxx npm run import:usda -w server");
  process.exit(1);
}

const currentFilePath = fileURLToPath(import.meta.url);
const scriptDirPath = path.dirname(currentFilePath);
const outputPath = process.env.USDA_OUTPUT_PATH || path.resolve(scriptDirPath, "../src/data/catalog/foods.usda.json");

const coreItems = [
  { id: "chicken", query: "chicken breast raw", type: "protein", defaultPortion: 120 },
  { id: "turkey", query: "turkey breast raw", type: "protein", defaultPortion: 120 },
  { id: "beef_lean", query: "beef sirloin lean raw", type: "protein", defaultPortion: 110 },
  { id: "salmon", query: "salmon raw", type: "protein", defaultPortion: 120 },
  { id: "egg", query: "egg whole raw", type: "protein", defaultPortion: 100 },
  { id: "rice", query: "rice cooked", type: "carb", defaultPortion: 160 },
  { id: "oats", query: "oats dry", type: "carb", defaultPortion: 80 },
  { id: "potato", query: "potato boiled", type: "carb", defaultPortion: 220 },
  { id: "pasta", query: "pasta cooked", type: "carb", defaultPortion: 150 },
  { id: "quinoa", query: "quinoa cooked", type: "carb", defaultPortion: 150 },
  { id: "olive_oil", query: "olive oil", type: "fat", defaultPortion: 12 },
  { id: "avocado", query: "avocado raw", type: "fat", defaultPortion: 70 },
  { id: "almond", query: "almonds raw", type: "fat", defaultPortion: 28 },
  { id: "peanut_butter", query: "peanut butter", type: "fat", defaultPortion: 24 },
  { id: "walnut", query: "walnuts", type: "fat", defaultPortion: 20 }
];

const extraQueries = [
  "cod", "tuna", "shrimp", "sardine", "mackerel", "lamb", "pork loin", "tofu", "tempeh", "cottage cheese",
  "greek yogurt", "lentils cooked", "chickpeas cooked", "black beans cooked", "kidney beans cooked", "peas",
  "bulgur cooked", "barley cooked", "buckwheat cooked", "couscous cooked", "whole wheat bread", "rye bread",
  "sweet potato", "corn cooked", "banana", "apple", "blueberries", "strawberries", "broccoli", "cauliflower",
  "spinach", "kale", "bell pepper", "tomato", "onion", "carrot", "zucchini", "eggplant", "mushroom",
  "chia seeds", "flaxseed", "sesame seeds", "sunflower seeds", "pumpkin seeds", "cashews", "hazelnuts",
  "pistachios", "pecans", "macadamia nuts", "canola oil", "coconut oil", "butter", "ghee", "cheddar cheese",
  "mozzarella", "milk", "kefir", "quark", "turkey ham", "beef liver", "chicken thigh", "chicken drumstick"
];

function numberOrZero(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toSlug(text) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9\s_-]/g, "")
    .trim()
    .replace(/\s+/g, "_");
}

function getNutrient(foodNutrients, candidates) {
  const row = foodNutrients.find((entry) => {
    const name = String(entry.nutrientName || "").toLowerCase();
    const number = String(entry.nutrientNumber || "");

    return candidates.some((candidate) => {
      if (candidate.number && candidate.number === number) {
        return true;
      }
      if (candidate.nameIncludes && name.includes(candidate.nameIncludes)) {
        return true;
      }
      return false;
    });
  });

  return numberOrZero(row?.value);
}

function classifyType({ protein, carb, fat }) {
  if (fat >= carb && fat >= protein) {
    return "fat";
  }
  if (protein >= carb && protein >= fat) {
    return "protein";
  }
  return "carb";
}

function defaultPortionForType(type) {
  if (type === "protein") return 120;
  if (type === "carb") return 150;
  return 20;
}

function fromUsdaFood(food, fallback = {}) {
  const nutrients = Array.isArray(food?.foodNutrients) ? food.foodNutrients : [];
  const protein = getNutrient(nutrients, [{ number: "203" }, { nameIncludes: "protein" }]);
  const carb = getNutrient(nutrients, [{ number: "205" }, { nameIncludes: "carbohydrate" }]);
  const fat = getNutrient(nutrients, [{ number: "204" }, { nameIncludes: "lipid" }]);
  const usdaCalories = getNutrient(nutrients, [
    { number: "1008" },
    { number: "208" },
    { nameIncludes: "energy (kcal)" }
  ]);

  if (!(protein || carb || fat || usdaCalories)) {
    return null;
  }

  const type = fallback.type || classifyType({ protein, carb, fat });
  const name = String(food.description || "").trim();
  if (!name) {
    return null;
  }

  const computedCalories = Math.round(protein * 4 + carb * 4 + fat * 9);
  const deviation =
    usdaCalories > 0 ? Math.abs(usdaCalories - computedCalories) / Math.max(1, computedCalories) : Number.POSITIVE_INFINITY;
  const calories = deviation <= 0.2 ? Math.round(usdaCalories) : computedCalories;

  return {
    id: fallback.id || toSlug(name),
    name,
    type,
    protein: Math.round(protein * 10) / 10,
    carb: Math.round(carb * 10) / 10,
    fat: Math.round(fat * 10) / 10,
    calories,
    defaultPortion: fallback.defaultPortion || defaultPortionForType(type),
    source: {
      name: "USDA FoodData Central",
      foodId: String(food.fdcId || ""),
      dataType: String(food.dataType || ""),
      fetchedAt: new Date().toISOString()
    }
  };
}

async function searchUsda(query, pageSize = 25, pageNumber = 1) {
  const url = new URL(API_BASE);
  url.searchParams.set("api_key", USDA_API_KEY);
  const response = await fetch(url.toString(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      query,
      pageSize,
      pageNumber,
      dataType: ["Foundation", "SR Legacy", "Survey (FNDDS)"]
    })
  });
  if (!response.ok) {
    throw new Error(`USDA search hatasi (${response.status})`);
  }

  const payload = await response.json();
  return Array.isArray(payload?.foods) ? payload.foods : [];
}

async function main() {
  const itemsById = new Map();

  for (const target of coreItems) {
    const results = await searchUsda(target.query, 10, 1);
    const mapped = results.map((food) => fromUsdaFood(food, target)).filter(Boolean);
    if (!mapped.length) {
      continue;
    }

    itemsById.set(target.id, mapped[0]);
  }

  for (const query of extraQueries) {
    if (itemsById.size >= TARGET_COUNT) {
      break;
    }

    const results = await searchUsda(query, 30, 1);

    for (const food of results) {
      if (itemsById.size >= TARGET_COUNT) {
        break;
      }

      const mapped = fromUsdaFood(food);
      if (!mapped) {
        continue;
      }

      let uniqueId = mapped.id || `food_${itemsById.size + 1}`;
      let suffix = 2;
      while (itemsById.has(uniqueId)) {
        uniqueId = `${mapped.id}_${suffix}`;
        suffix += 1;
      }

      itemsById.set(uniqueId, { ...mapped, id: uniqueId });
    }
  }

  const items = Array.from(itemsById.values())
    .map((item) => ({
      id: item.id,
      name: item.name,
      type: item.type,
      protein: item.protein,
      carb: item.carb,
      fat: item.fat,
      calories: item.calories,
      defaultPortion: item.defaultPortion,
      source: item.source
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "en"));

  const payload = {
    source: "USDA FoodData Central",
    generatedAt: new Date().toISOString(),
    itemCount: items.length,
    items
  };

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, JSON.stringify(payload, null, 2), "utf8");

  console.log(`USDA import tamamlandi: ${items.length} kayit -> ${outputPath}`);
}

main().catch((error) => {
  console.error("USDA import basarisiz:", error.message);
  process.exit(1);
});
