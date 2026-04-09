import { macrosForItem, roundMacros } from "../lib/macros.js";

const recipeTemplates = [
  {
    id: "blueberry_power_pancakes",
    title: "Blueberry Power Pancakes",
    prepMinutes: 15,
    tag: "High Protein",
    category: "high protein",
    image: {
      url: "https://images.unsplash.com/photo-1528207776546-365bb710ee93?auto=format&fit=crop&w=1200&q=80",
      sourceName: "Unsplash",
      sourceLicense: "Unsplash License"
    },
    ingredients: [
      { foodId: "oats", grams: 60 },
      { foodId: "egg", grams: 120 },
      { foodId: "avocado", grams: 20 }
    ]
  },
  {
    id: "spicy_turkey_bowl",
    title: "Spicy Turkey Bowl",
    prepMinutes: 20,
    tag: "Quick",
    category: "quick",
    image: {
      url: "https://images.unsplash.com/photo-1559847844-d721426d6edc?auto=format&fit=crop&w=1200&q=80",
      sourceName: "Unsplash",
      sourceLicense: "Unsplash License"
    },
    ingredients: [
      { foodId: "turkey", grams: 170 },
      { foodId: "rice", grams: 170 },
      { foodId: "olive_oil", grams: 10 }
    ]
  },
  {
    id: "chia_overnight_oats",
    title: "Chia Overnight Oats",
    prepMinutes: 5,
    tag: "Low Carb",
    category: "low carb",
    image: {
      url: "https://images.unsplash.com/photo-1515003197210-e0cd71810b5f?auto=format&fit=crop&w=1200&q=80",
      sourceName: "Unsplash",
      sourceLicense: "Unsplash License"
    },
    ingredients: [
      { foodId: "oats", grams: 55 },
      { foodId: "almond", grams: 18 },
      { foodId: "avocado", grams: 30 }
    ]
  },
  {
    id: "spinach_veggie_scramble",
    title: "Spinach Veggie Scramble",
    prepMinutes: 10,
    tag: "Quick",
    category: "quick",
    image: {
      url: "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1200&q=80",
      sourceName: "Unsplash",
      sourceLicense: "Unsplash License"
    },
    ingredients: [
      { foodId: "egg", grams: 180 },
      { foodId: "potato", grams: 100 },
      { foodId: "olive_oil", grams: 8 }
    ]
  },
  {
    id: "turkey_lettuce_wraps",
    title: "Turkey Lettuce Wraps",
    prepMinutes: 15,
    tag: "Low Carb",
    category: "low carb",
    image: {
      url: "https://images.unsplash.com/photo-1541544741938-0af808871cc0?auto=format&fit=crop&w=1200&q=80",
      sourceName: "Unsplash",
      sourceLicense: "Unsplash License"
    },
    ingredients: [
      { foodId: "turkey", grams: 180 },
      { foodId: "avocado", grams: 70 },
      { foodId: "olive_oil", grams: 8 }
    ]
  },
  {
    id: "lean_beef_stir_fry",
    title: "Lean Beef Stir Fry",
    prepMinutes: 22,
    tag: "High Protein",
    category: "high protein",
    image: {
      url: "https://images.unsplash.com/photo-1600891963935-c1f8d1b7b8f2?auto=format&fit=crop&w=1200&q=80",
      sourceName: "Unsplash",
      sourceLicense: "Unsplash License"
    },
    ingredients: [
      { foodId: "beef_lean", grams: 190 },
      { foodId: "rice", grams: 140 },
      { foodId: "olive_oil", grams: 12 }
    ]
  },
  {
    id: "baked_cod_greens",
    title: "Baked Cod and Greens",
    prepMinutes: 20,
    tag: "Keto",
    category: "keto",
    image: {
      url: "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=1200&q=80",
      sourceName: "Unsplash",
      sourceLicense: "Unsplash License"
    },
    ingredients: [
      { foodId: "salmon", grams: 170 },
      { foodId: "avocado", grams: 80 },
      { foodId: "olive_oil", grams: 8 }
    ]
  }
];

const recipeSections = [
  {
    id: "power_lunches",
    title: "Power Lunches",
    items: ["turkey_lettuce_wraps", "spicy_turkey_bowl"]
  },
  {
    id: "high_protein_dinners",
    title: "High-Protein Dinners",
    items: ["lean_beef_stir_fry", "baked_cod_greens"]
  }
];

function computeRecipe(template, foodLookup) {
  const missingIngredientIds = [];
  const ingredientRows = [];

  for (const entry of template.ingredients) {
    const food = foodLookup[entry.foodId];
    if (!food) {
      missingIngredientIds.push(entry.foodId);
      continue;
    }

    const grams = Math.max(1, Number(entry.grams) || 1);
    ingredientRows.push({
      foodId: entry.foodId,
      name: food.name,
      type: food.type,
      grams,
      macros: roundMacros(macrosForItem(food, grams))
    });
  }

  const totals = ingredientRows.reduce(
    (acc, row) => ({
      protein: acc.protein + row.macros.protein,
      carb: acc.carb + row.macros.carb,
      fat: acc.fat + row.macros.fat,
      calories: acc.calories + row.macros.calories
    }),
    { protein: 0, carb: 0, fat: 0, calories: 0 }
  );

  const rounded = roundMacros(totals);

  return {
    id: template.id,
    title: template.title,
    prepMinutes: template.prepMinutes,
    tag: template.tag,
    category: template.category,
    image: template.image.url,
    imageSource: {
      name: template.image.sourceName,
      license: template.image.sourceLicense
    },
    calories: rounded.calories,
    protein: rounded.protein,
    carb: rounded.carb,
    fat: rounded.fat,
    ingredients: ingredientRows,
    dataQuality: {
      computedFromIngredients: true,
      missingIngredientIds
    }
  };
}

export function listRecipeCatalog(foods) {
  const foodLookup = Object.fromEntries((foods || []).map((food) => [food.id, food]));
  const recipes = recipeTemplates.map((template) => computeRecipe(template, foodLookup));

  const categories = ["all", ...new Set(recipes.map((recipe) => recipe.category))];

  return {
    categories,
    sections: recipeSections,
    recipes,
    meta: {
      recipeCount: recipes.length,
      computedFromIngredientMacros: true
    }
  };
}
