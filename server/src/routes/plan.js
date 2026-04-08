import { Router } from "express";
import { createFoodItem, getFoodsByIds, listFoods, removeFoodItemById } from "../data/foods.js";
import { buildMealPlan, swapMealItem } from "../lib/generator.js";
import { dailyMacroTargets, estimateCalories, roundMacros } from "../lib/macros.js";

const planRouter = Router();

planRouter.get("/foods", async (_req, res) => {
  try {
    const foods = await listFoods();
    res.json({ foods });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

planRouter.post("/foods", async (req, res) => {
  try {
    const nextFood = await createFoodItem(req.body);
    const foods = await listFoods();
    res.status(201).json({ food: nextFood, foods });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

planRouter.delete("/foods/:foodId", async (req, res) => {
  try {
    const removed = await removeFoodItemById(req.params.foodId);
    const foods = await listFoods();
    res.json({ removed, foods });
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

export { planRouter };
