import { roundMacros } from "./macros.js";

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function normalizeCartItems(rawItems = []) {
  if (!Array.isArray(rawItems)) {
    return [];
  }

  return rawItems
    .map((item) => ({
      id: String(item?.id || "meal_unknown"),
      title: String(item?.title || "Meal"),
      qty: Math.max(1, Math.round(toNumber(item?.qty) || 1)),
      calories: Math.max(0, toNumber(item?.calories)),
      protein: Math.max(0, toNumber(item?.protein)),
      carb: Math.max(0, toNumber(item?.carb)),
      fat: Math.max(0, toNumber(item?.fat)),
      ingredientIds: Array.isArray(item?.ingredientIds) ? item.ingredientIds.map((value) => String(value)) : [],
      ingredientBreakdown: Array.isArray(item?.ingredientBreakdown)
        ? item.ingredientBreakdown.map((entry) => ({
            id: String(entry?.id || "").trim(),
            grams: Math.max(0, toNumber(entry?.grams))
          }))
        : []
    }))
    .filter((item) => item.calories > 0 || item.protein > 0 || item.carb > 0 || item.fat > 0);
}

function computeCartTotals(items) {
  const totals = items.reduce(
    (acc, item) => {
      acc.calories += item.calories * item.qty;
      acc.protein += item.protein * item.qty;
      acc.carb += item.carb * item.qty;
      acc.fat += item.fat * item.qty;
      return acc;
    },
    { calories: 0, protein: 0, carb: 0, fat: 0 }
  );

  return roundMacros(totals);
}

function toIngredientDetail(id, ingredientLookup = {}) {
  const match = ingredientLookup?.[id];
  if (!match) {
    return { id, name: id, type: "unknown" };
  }

  return {
    id,
    name: match.name,
    type: match.type
  };
}

function buildIngredientStockComparison(items, ingredientLookup = {}, inventoryMap = {}) {
  const requiredByFood = new Map();
  for (const item of items) {
    const breakdown = Array.isArray(item.ingredientBreakdown) ? item.ingredientBreakdown : [];
    for (const entry of breakdown) {
      const key = String(entry?.id || "").trim();
      if (!key) continue;

      const grams = Math.max(0, Number(entry.grams) || 0) * item.qty;
      requiredByFood.set(key, (requiredByFood.get(key) || 0) + grams);
    }
  }

  const rows = Array.from(requiredByFood.entries())
    .map(([id, requiredGrams]) => {
      const availableGrams = Math.max(0, Number(inventoryMap[id]) || 0);
      const missingGrams = Math.max(0, Math.round(requiredGrams - availableGrams));
      return {
        ...toIngredientDetail(id, ingredientLookup),
        requiredGrams: Math.round(requiredGrams),
        availableGrams,
        missingGrams
      };
    })
    .sort((a, b) => b.missingGrams - a.missingGrams);

  const missing = rows.filter((entry) => entry.missingGrams > 0);
  const complete = rows.filter((entry) => entry.missingGrams <= 0);

  const hasBreakdown = rows.length > 0;
  const note = hasBreakdown
    ? "Cart meal malzemeleri inventory ile karsilastirildi."
    : "Cart meal ingredient gram verisi olmadigi icin inventory karsilastirmasi sinirli.";

  return {
    hasBreakdown,
    note,
    missing,
    complete
  };
}

function normalizeTotals(totals = {}) {
  return {
    calories: Math.max(0, toNumber(totals.calories)),
    protein: Math.max(0, toNumber(totals.protein)),
    carb: Math.max(0, toNumber(totals.carb)),
    fat: Math.max(0, toNumber(totals.fat))
  };
}

function mergeTotals(previousTotals, cartTotals) {
  return roundMacros({
    calories: toNumber(previousTotals.calories) + toNumber(cartTotals.calories),
    protein: toNumber(previousTotals.protein) + toNumber(cartTotals.protein),
    carb: toNumber(previousTotals.carb) + toNumber(cartTotals.carb),
    fat: toNumber(previousTotals.fat) + toNumber(cartTotals.fat)
  });
}

function macroDirection(value) {
  if (value > 0) return "fazla";
  if (value < 0) return "eksik";
  return "tam";
}

function buildMacroFeedback(delta) {
  const keys = [
    { key: "calories", label: "Kalori", unit: "kcal" },
    { key: "protein", label: "Protein", unit: "g" },
    { key: "carb", label: "Karbonhidrat", unit: "g" },
    { key: "fat", label: "Yag", unit: "g" }
  ];

  return keys.map((item) => {
    const value = Math.round(Math.abs(toNumber(delta[item.key])) * 10) / 10;
    const direction = macroDirection(toNumber(delta[item.key]));

    if (direction === "tam") {
      return {
        key: item.key,
        label: item.label,
        direction,
        amount: 0,
        unit: item.unit,
        message: `${item.label} hedefi tam karsilandi.`
      };
    }

    return {
      key: item.key,
      label: item.label,
      direction,
      amount: value,
      unit: item.unit,
      message: `${item.label} hedefe gore ${value} ${item.unit} ${direction}.`
    };
  });
}

export function analyzeCheckout({
  cartItems,
  dailyTarget,
  ingredientLookup = {},
  inventoryMap = {},
  previousTotals = { calories: 0, protein: 0, carb: 0, fat: 0 }
}) {
  const items = normalizeCartItems(cartItems);
  if (!items.length) {
    throw new Error("Checkout icin cart bos olamaz.");
  }

  const cartTotals = computeCartTotals(items);
  const existingTotals = roundMacros(normalizeTotals(previousTotals));
  const projectedTotals = mergeTotals(existingTotals, cartTotals);
  const target = roundMacros(dailyTarget);

  const delta = {
    calories: Math.round((projectedTotals.calories - target.calories) * 10) / 10,
    protein: Math.round((projectedTotals.protein - target.protein) * 10) / 10,
    carb: Math.round((projectedTotals.carb - target.carb) * 10) / 10,
    fat: Math.round((projectedTotals.fat - target.fat) * 10) / 10
  };

  const ingredient = buildIngredientStockComparison(items, ingredientLookup, inventoryMap);
  const macroFeedback = buildMacroFeedback(delta);

  const ingredientFeedback = ingredient.missing.map(
    (entry) => `${entry.name}: ${entry.missingGrams}g eksik (gereken ${entry.requiredGrams}g / stok ${entry.availableGrams}g).`
  );

  return {
    ingredient,
    macros: {
      target,
      previousTotals: existingTotals,
      cartTotals,
      projectedTotals,
      delta
    },
    feedback: {
      macros: macroFeedback,
      ingredients: ingredientFeedback,
      summary:
        ingredient.missing.length > 0
          ? `${ingredient.missing.length} malzeme inventoryde eksik.`
          : "Cart malzemeleri inventory stoklarina gore karsilaniyor."
    }
  };
}