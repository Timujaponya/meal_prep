import { Router } from "express";
import {
  appendMealLog,
  appendWaterLog,
  deleteMealLogBySource,
  getDailyMealLog,
  getDailyWaterStatus,
  replaceMealLogBySource
} from "../data/tracker.js";
import {
  createDashboardMeal,
  deleteDashboardMeal,
  listDashboardMeals,
  updateDashboardMeal
} from "../data/dashboardMeals.js";
import { listRecipeCatalog } from "../data/recipes.js";
import {
  deleteInventoryRowsByFoodId,
  getInventoryMap,
  incrementInventoryItem,
  listUserInventory,
  upsertInventoryItem
} from "../data/inventory.js";
import { analyzeCheckout, normalizeCartItems } from "../lib/checkout.js";
import { createFoodItem, getFoodsByIds, listFoods, removeFoodItemById, updateFoodItem } from "../data/foods.js";
import { buildMealPlan, swapMealItem } from "../lib/generator.js";
import { resolveIngredientQuery, resolvePortionExpression } from "../lib/ingredientNormalization.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { dailyMacroTargets, estimateCalories, roundMacros } from "../lib/macros.js";
import { buildShoppingList } from "../lib/shoppingList.js";

const planRouter = Router();

planRouter.use(requireAuth);

planRouter.get("/foods", async (_req, res) => {
  try {
    const foods = await listFoods();
    res.json({ foods });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

planRouter.get("/recipes", async (_req, res) => {
  try {
    const foods = await listFoods();
    const payload = listRecipeCatalog(foods);
    res.json(payload);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

planRouter.post("/foods/resolve", async (req, res) => {
  try {
    const query = String(req.body?.query || "").trim();
    const foods = await listFoods();
    const matched = resolveIngredientQuery(query, foods, { strict: false });

    res.json({
      query,
      match: matched
        ? {
            food: matched.food,
            matchedBy: matched.matchedBy
          }
        : null
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

planRouter.post("/foods/portion-resolve", async (req, res) => {
  try {
    const expression = String(req.body?.expression || "").trim();
    const foods = await listFoods();
    const resolved = resolvePortionExpression(expression, foods);

    if (!resolved) {
      throw new Error("Portion ifadesi cozumlenemedi. Ornek: '1 egg' veya '1 cup rice'.");
    }

    res.json({ expression, resolved });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

planRouter.post("/foods", requireRole("admin"), async (req, res) => {
  try {
    const currentFoods = await listFoods();
    const matched = resolveIngredientQuery(req.body?.name, currentFoods, { strict: true });

    if (matched) {
      res.status(200).json({
        food: matched.food,
        foods: currentFoods,
        deduplicated: true,
        matchedBy: matched.matchedBy
      });
      return;
    }

    const nextFood = await createFoodItem(req.body);
    const foods = await listFoods();
    res.status(201).json({ food: nextFood, foods });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

planRouter.delete("/foods/:foodId", requireRole("admin"), async (req, res) => {
  try {
    const removed = await removeFoodItemById(req.params.foodId);
    await deleteInventoryRowsByFoodId(req.params.foodId);
    const foods = await listFoods();
    res.json({ removed, foods });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

planRouter.put("/foods/:foodId", requireRole("admin"), async (req, res) => {
  try {
    const food = await updateFoodItem(req.params.foodId, req.body);
    const foods = await listFoods();
    res.json({ food, foods });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

planRouter.post("/generate", async (req, res) => {
  try {
    const { profile = {}, selectedFoodIds = [], mealCount = 4 } = req.body ?? {};
    const chosenFoods = await getFoodsByIds(selectedFoodIds);

    const calories =
      profile.calorieMode === "auto"
        ? estimateCalories({
            weightKg: profile.weightKg,
            heightCm: profile.heightCm,
            goal: profile.goal
          })
        : Number(profile.calories || 2200);

    const dailyTarget = dailyMacroTargets({
      calories,
      goal: profile.goal,
      weightKg: profile.weightKg
    });
    const { meals, totals } = buildMealPlan({ selectedFoods: chosenFoods, dailyTarget, mealCount });

    res.json({
      profile: {
        ...profile,
        calories
      },
      dailyTarget: roundMacros(dailyTarget),
      meals,
      totals
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

planRouter.post("/swap", async (req, res) => {
  try {
    const { meal, slotType, selectedFoodIds = [] } = req.body ?? {};
    const chosenFoods = await getFoodsByIds(selectedFoodIds);

    const swappedMeal = swapMealItem({ meal, slotType, selectedFoods: chosenFoods });
    res.json({ meal: swappedMeal });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

planRouter.post("/shopping-list", (req, res) => {
  try {
    const shoppingList = buildShoppingList(req.body ?? {});
    res.json(shoppingList);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

planRouter.get("/inventory", async (req, res) => {
  try {
    const foods = await listFoods();
    const current = await listUserInventory(req.auth.userId);
    const map = Object.fromEntries(current.map((entry) => [entry.foodId, entry.amountGrams]));

    const items = foods.map((food) => ({
      ...food,
      amountGrams: map[food.id] || 0
    }));

    res.json({ items });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

planRouter.post("/inventory", async (req, res) => {
  try {
    const foodId = String(req.body?.foodId || "").trim();
    const amountGrams = Number(req.body?.amountGrams || 0);
    const foodExists = (await getFoodsByIds([foodId])).length > 0;
    if (!foodExists) {
      throw new Error("Gecersiz malzeme secimi.");
    }

    const adjustment = await upsertInventoryItem({
      userId: req.auth.userId,
      foodId,
      amountGrams
    });

    const foods = await listFoods();
    const current = await listUserInventory(req.auth.userId);
    const map = Object.fromEntries(current.map((entry) => [entry.foodId, entry.amountGrams]));
    const items = foods.map((food) => ({ ...food, amountGrams: map[food.id] || 0 }));

    res.status(201).json({ items, adjustment });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

planRouter.post("/inventory/increment", async (req, res) => {
  try {
    const foodId = String(req.body?.foodId || "").trim();
    const deltaGrams = Number(req.body?.deltaGrams || 0);

    const foodExists = (await getFoodsByIds([foodId])).length > 0;
    if (!foodExists) {
      throw new Error("Gecersiz malzeme secimi.");
    }

    const adjustment = await incrementInventoryItem({
      userId: req.auth.userId,
      foodId,
      deltaGrams
    });

    const foods = await listFoods();
    const current = await listUserInventory(req.auth.userId);
    const map = Object.fromEntries(current.map((entry) => [entry.foodId, entry.amountGrams]));
    const items = foods.map((food) => ({ ...food, amountGrams: map[food.id] || 0 }));

    res.status(201).json({ items, adjustment });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

planRouter.get("/dashboard-meals", async (req, res) => {
  try {
    const meals = await listDashboardMeals(req.auth.userId);
    res.json({ meals });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

planRouter.post("/dashboard-meals", async (req, res) => {
  try {
    const meal = await createDashboardMeal(req.auth.userId, req.body ?? {});
    const meals = await listDashboardMeals(req.auth.userId);
    res.status(201).json({ meal, meals });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

planRouter.put("/dashboard-meals/:mealId", async (req, res) => {
  try {
    const meal = await updateDashboardMeal(req.auth.userId, req.params.mealId, req.body ?? {});
    const meals = await listDashboardMeals(req.auth.userId);
    res.json({ meal, meals });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

planRouter.delete("/dashboard-meals/:mealId", async (req, res) => {
  try {
    const removed = await deleteDashboardMeal(req.auth.userId, req.params.mealId);
    const meals = await listDashboardMeals(req.auth.userId);
    res.json({ removed, meals });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

planRouter.post("/checkout", async (req, res) => {
  try {
    const { cartItems = [], profile = {}, date } = req.body ?? {};
    const safeDate = String(date || "").trim();

    if (!/^\d{4}-\d{2}-\d{2}$/.test(safeDate)) {
      throw new Error("Checkout icin gecerli bir tarih zorunludur (YYYY-MM-DD).");
    }

    const calories =
      profile.calorieMode === "auto"
        ? estimateCalories({
            weightKg: profile.weightKg,
            heightCm: profile.heightCm,
            goal: profile.goal
          })
        : Number(profile.calories || 2200);

    const dailyTarget = dailyMacroTargets({
      calories,
      goal: profile.goal,
      weightKg: profile.weightKg
    });

    const normalizedItems = normalizeCartItems(cartItems);
    const foodCatalog = await listFoods();
    const ingredientLookup = Object.fromEntries(
      foodCatalog.map((food) => [food.id, { id: food.id, name: food.name, type: food.type }])
    );

    const inventoryMap = await getInventoryMap(req.auth.userId);
    const previousMealLog = await getDailyMealLog({ userId: req.auth.userId, date: safeDate });

    const analysis = analyzeCheckout({
      cartItems: normalizedItems,
      dailyTarget,
      ingredientLookup,
      inventoryMap,
      previousTotals: previousMealLog.totals
    });

    await appendMealLog({ userId: req.auth.userId, date: safeDate, items: normalizedItems });

    const mealLog = await getDailyMealLog({ userId: req.auth.userId, date: safeDate });
    const waterTargetMl = Math.max(1200, Math.min(5000, Math.round((Number(profile.weightKg) || 78) * 35)));
    const water = await getDailyWaterStatus({ userId: req.auth.userId, date: safeDate, targetMl: waterTargetMl });

    res.json({
      date: mealLog.date,
      analysis,
      dayLog: {
        meals: mealLog,
        water
      }
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

planRouter.get("/day-log", async (req, res) => {
  try {
    const date = req.query.date;
    const targetMl = Number(req.query.targetMl || 2800);
    const meals = await getDailyMealLog({ userId: req.auth.userId, date });
    const water = await getDailyWaterStatus({ userId: req.auth.userId, date, targetMl });

    res.json({
      date: meals.date,
      meals,
      water
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

planRouter.post("/day-log/entries", async (req, res) => {
  try {
    const date = req.body?.date;
    const entry = req.body?.entry || {};
    const targetMl = Number(req.body?.targetMl || 2800);

    const sourceId = String(entry.sourceId || `manual_${Date.now()}`).trim();
    const payload = {
      id: sourceId,
      title: String(entry.title || "Manual Meal").trim(),
      qty: Math.max(1, Number(entry.quantity) || 1),
      calories: Math.max(0, Number(entry.calories) || 0),
      protein: Math.max(0, Number(entry.protein) || 0),
      carb: Math.max(0, Number(entry.carb) || 0),
      fat: Math.max(0, Number(entry.fat) || 0),
      ingredientIds: []
    };

    if (payload.calories <= 0 && payload.protein <= 0 && payload.carb <= 0 && payload.fat <= 0) {
      throw new Error("Manuel kayit icin en az bir makro veya kalori degeri sifirdan buyuk olmali.");
    }

    await appendMealLog({ userId: req.auth.userId, date, items: [payload] });

    const meals = await getDailyMealLog({ userId: req.auth.userId, date });
    const water = await getDailyWaterStatus({ userId: req.auth.userId, date, targetMl });

    res.status(201).json({
      date: meals.date,
      meals,
      water
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

planRouter.put("/day-log/entries/:sourceId", async (req, res) => {
  try {
    const sourceId = String(req.params.sourceId || "").trim();
    const date = req.body?.date;
    const entry = req.body?.entry || {};
    const targetMl = Number(req.body?.targetMl || 2800);

    await replaceMealLogBySource({
      userId: req.auth.userId,
      date,
      sourceId,
      entry
    });

    const meals = await getDailyMealLog({ userId: req.auth.userId, date });
    const water = await getDailyWaterStatus({ userId: req.auth.userId, date, targetMl });

    res.json({
      date: meals.date,
      meals,
      water
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

planRouter.delete("/day-log/entries/:sourceId", async (req, res) => {
  try {
    const sourceId = String(req.params.sourceId || "").trim();
    const date = req.query.date;
    const targetMl = Number(req.query.targetMl || 2800);

    await deleteMealLogBySource({
      userId: req.auth.userId,
      date,
      sourceId
    });

    const meals = await getDailyMealLog({ userId: req.auth.userId, date });
    const water = await getDailyWaterStatus({ userId: req.auth.userId, date, targetMl });

    res.json({
      date: meals.date,
      meals,
      water
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

planRouter.get("/water", async (req, res) => {
  try {
    const date = req.query.date;
    const targetMl = Number(req.query.targetMl || 2800);
    const water = await getDailyWaterStatus({ userId: req.auth.userId, date, targetMl });
    res.json(water);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

planRouter.post("/water", async (req, res) => {
  try {
    const { date, amountMl, targetMl } = req.body ?? {};
    const adjustment = await appendWaterLog({ userId: req.auth.userId, date, amountMl });
    const water = await getDailyWaterStatus({ userId: req.auth.userId, date, targetMl });
    res.status(201).json({ water, adjustment });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

export { planRouter };
