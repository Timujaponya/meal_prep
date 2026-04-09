import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { listRecipeCatalog } from "../src/data/recipes.js";
import { buildMealPlan } from "../src/lib/generator.js";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function checkAuthSecret() {
  const secret = String(process.env.AUTH_SECRET || "").trim();
  assert(secret.length >= 32, "AUTH_SECRET en az 32 karakter olmali.");
}

function checkRecipeIntegrity() {
  const currentFilePath = fileURLToPath(import.meta.url);
  const scriptDirPath = path.dirname(currentFilePath);
  const catalogPath = path.resolve(scriptDirPath, "../src/data/catalog/foods.curated.json");

  const curated = JSON.parse(fs.readFileSync(catalogPath, "utf8"));
  const foods = Array.isArray(curated?.items) ? curated.items : [];
  const payload = listRecipeCatalog(foods);

  const missingCount = payload.recipes.reduce(
    (acc, recipe) => acc + (Array.isArray(recipe?.dataQuality?.missingIngredientIds) ? recipe.dataQuality.missingIngredientIds.length : 0),
    0
  );

  assert(payload.recipes.length > 0, "Recipe katalog bos olamaz.");
  assert(missingCount === 0, "Recipe katalogda eksik ingredient bulunmamali.");
}

function checkPlanDiversity() {
  const selectedFoods = [
    { id: "p1", type: "protein", protein: 30, carb: 0, fat: 3, calories: 150, defaultPortion: 100, name: "P1" },
    { id: "p2", type: "protein", protein: 29, carb: 0, fat: 4, calories: 155, defaultPortion: 100, name: "P2" },
    { id: "c1", type: "carb", protein: 3, carb: 28, fat: 1, calories: 130, defaultPortion: 100, name: "C1" },
    { id: "c2", type: "carb", protein: 4, carb: 27, fat: 1, calories: 131, defaultPortion: 100, name: "C2" },
    { id: "f1", type: "fat", protein: 0, carb: 0, fat: 100, calories: 884, defaultPortion: 10, name: "F1" },
    { id: "f2", type: "fat", protein: 1, carb: 1, fat: 99, calories: 890, defaultPortion: 10, name: "F2" }
  ];

  const output = buildMealPlan({
    selectedFoods,
    dailyTarget: { calories: 2400, protein: 180, carb: 220, fat: 70 },
    mealCount: 6
  });

  const comboKeys = output.meals.map((meal) => meal.comboKey);
  assert(new Set(comboKeys).size === comboKeys.length, "Plan combo keyleri tekrar etmemeli.");
}

function main() {
  checkAuthSecret();
  checkRecipeIntegrity();
  checkPlanDiversity();
  console.log("Smoke integrity checks passed.");
}

main();
