import { Router } from "express";
import { createFoodItem, foodItems, removeFoodItemById } from "../data/foods.js";
import { buildMealPlan, swapMealItem } from "../lib/generator.js";
import { dailyMacroTargets, estimateCalories, roundMacros } from "../lib/macros.js";

const planRouter = Router();

planRouter.get("/foods", (_req, res) => {
  res.json({ foods: foodItems });
});

planRouter.post("/foods", (req, res) => {
  try {
    const nextFood = createFoodItem(req.body);
    res.status(201).json({ food: nextFood, foods: foodItems });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

planRouter.delete("/foods/:foodId", (req, res) => {
  try {
    const removed = removeFoodItemById(req.params.foodId);
    res.json({ removed, foods: foodItems });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

planRouter.post("/generate", (req, res) => {
  try {
    const { profile = {}, selectedFoodIds = [], mealCount = 4 } = req.body ?? {};
    const chosenFoods = foodItems.filter((food) => selectedFoodIds.includes(food.id));

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

planRouter.post("/swap", (req, res) => {
  try {
    const { meal, slotType, selectedFoodIds = [] } = req.body ?? {};
    const chosenFoods = foodItems.filter((food) => selectedFoodIds.includes(food.id));

    const swappedMeal = swapMealItem({ meal, slotType, selectedFoods: chosenFoods });
    res.json({ meal: swappedMeal });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

export { planRouter };
