import "dotenv/config";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const currentFilePath = fileURLToPath(import.meta.url);
const scriptDirPath = path.dirname(currentFilePath);
const defaultInputPath = path.resolve(scriptDirPath, "../src/data/catalog/foods.usda.json");
const defaultOutputPath = path.resolve(scriptDirPath, "../src/data/catalog/foods.curated.json");

const inputPath = process.env.USDA_INPUT_PATH || defaultInputPath;
const outputPath = process.env.CURATED_OUTPUT_PATH || defaultOutputPath;
const targetCount = Math.max(150, Number(process.env.CURATED_TARGET_COUNT) || 350);

const blockedNamePattern =
  /(baby|toddler|infant|formula|supplement|powder mix|snack|candy|cookie|cake|pie|icing|frosting|soda|cola|energy drink|alcohol|beer|wine|liquor|restaurant|fast food|school lunch|frozen meal|ready[- ]to[- ]eat|with gravy|sauce mix|syrup|dessert|pudding|ice cream|nutrition bar|sports drink|meal replacement|pet food)/i;

const coreIds = new Set([
  "chicken",
  "turkey",
  "beef_lean",
  "salmon",
  "egg",
  "rice",
  "oats",
  "potato",
  "pasta",
  "quinoa",
  "olive_oil",
  "avocado",
  "almond",
  "peanut_butter",
  "walnut"
]);

function normalizeName(name) {
  const raw = String(name || "").trim();
  if (!raw) {
    return "";
  }

  const withoutParens = raw.replace(/\([^)]*\)/g, "").trim();
  const parts = withoutParens
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  if (!parts.length) {
    return withoutParens;
  }

  const first = parts[0];
  const second = parts[1] || "";
  const keepSecond = /(raw|cooked|dry|boiled|baked|grilled|roasted|whole|skinless|boneless|fresh|plain)/i.test(second);

  return keepSecond ? `${first} ${second}`.trim() : first;
}

function isValidItem(item) {
  if (!item || typeof item !== "object") {
    return false;
  }

  if (!item.id || !item.name || !item.type) {
    return false;
  }

  if (!["protein", "carb", "fat"].includes(item.type)) {
    return false;
  }

  if (blockedNamePattern.test(String(item.name))) {
    return false;
  }

  return true;
}

function confidenceScore(item) {
  const sourceType = String(item?.source?.dataType || "").toLowerCase();
  const sourceScore = sourceType.includes("foundation") ? 4 : sourceType.includes("legacy") ? 3 : 2;
  const name = String(item.name || "");
  const lengthPenalty = Math.max(0, name.length - 28) * 0.06;
  const commaPenalty = (name.match(/,/g) || []).length * 0.7;
  const digitPenalty = /\d/.test(name) ? 0.5 : 0;
  return sourceScore + 2 - lengthPenalty - commaPenalty - digitPenalty;
}

function dedupeByNameAndType(items) {
  const byKey = new Map();

  for (const item of items) {
    const normalized = normalizeName(item.name);
    if (!normalized) {
      continue;
    }

    const key = `${item.type}::${normalized.toLowerCase()}`;
    const candidate = {
      ...item,
      name: normalized,
      _score: confidenceScore(item)
    };

    const current = byKey.get(key);
    if (!current || candidate._score > current._score) {
      byKey.set(key, candidate);
    }
  }

  return Array.from(byKey.values());
}

function chooseTopItems(items, count) {
  const sorted = [...items].sort((a, b) => {
    if (coreIds.has(a.id) && !coreIds.has(b.id)) return -1;
    if (!coreIds.has(a.id) && coreIds.has(b.id)) return 1;
    if (b._score !== a._score) return b._score - a._score;
    return a.name.localeCompare(b.name, "en");
  });

  const output = [];
  const seenId = new Set();

  for (const item of sorted) {
    if (output.length >= count) {
      break;
    }

    let id = String(item.id);
    let suffix = 2;
    while (seenId.has(id)) {
      id = `${item.id}_${suffix}`;
      suffix += 1;
    }

    seenId.add(id);
    output.push({
      id,
      name: item.name,
      type: item.type,
      protein: Number(item.protein) || 0,
      carb: Number(item.carb) || 0,
      fat: Number(item.fat) || 0,
      calories: Number(item.calories) || 0,
      defaultPortion: Math.max(1, Math.round(Number(item.defaultPortion) || 100)),
      source: item.source || { name: "USDA FoodData Central" }
    });
  }

  return output;
}

async function main() {
  const rawText = await fs.readFile(inputPath, "utf8");
  const parsed = JSON.parse(rawText);
  const rawItems = Array.isArray(parsed?.items) ? parsed.items : [];

  const filtered = rawItems.filter(isValidItem);
  const deduped = dedupeByNameAndType(filtered);
  const curatedItems = chooseTopItems(deduped, targetCount);

  for (const coreId of coreIds) {
    if (!curatedItems.some((item) => item.id === coreId)) {
      const fallback = rawItems.find((item) => item.id === coreId);
      if (fallback) {
        curatedItems.unshift({
          id: fallback.id,
          name: normalizeName(fallback.name),
          type: fallback.type,
          protein: Number(fallback.protein) || 0,
          carb: Number(fallback.carb) || 0,
          fat: Number(fallback.fat) || 0,
          calories: Number(fallback.calories) || 0,
          defaultPortion: Math.max(1, Math.round(Number(fallback.defaultPortion) || 100)),
          source: fallback.source || { name: "USDA FoodData Central" }
        });
      }
    }
  }

  const payload = {
    source: "Curated USDA snapshot",
    generatedAt: new Date().toISOString(),
    itemCount: curatedItems.length,
    items: curatedItems
  };

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, JSON.stringify(payload, null, 2), "utf8");

  console.log(`Curated katalog uretildi: ${curatedItems.length} kayit -> ${outputPath}`);
}

main().catch((error) => {
  console.error("Curated katalog olusturma basarisiz:", error.message);
  process.exit(1);
});
