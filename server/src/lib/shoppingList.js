const TYPE_ORDER = {
  protein: 1,
  carb: 2,
  fat: 3
};

function roundToStep(value, step) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  const safeStep = Math.max(1, Math.round(Number(step) || 1));
  return Math.max(0, Math.round(value / safeStep) * safeStep);
}

function sanitizeMacroSet(macros = {}) {
  return {
    protein: Number(macros.protein) || 0,
    carb: Number(macros.carb) || 0,
    fat: Number(macros.fat) || 0,
    calories: Number(macros.calories) || 0
  };
}

function mealItemsFromPayload(payload = {}) {
  if (Array.isArray(payload.meals)) {
    return payload.meals;
  }

  if (Array.isArray(payload.plan?.meals)) {
    return payload.plan.meals;
  }

  return [];
}

export function buildShoppingList(payload = {}) {
  const meals = mealItemsFromPayload(payload);
  if (!meals.length) {
    throw new Error("Shopping list olusturmak icin en az bir ogun gereklidir.");
  }

  const requestedDayCount = Number(payload.dayCount);
  const requestedRoundStep = Number(payload.roundTo);
  const dayCount = Math.max(1, Math.min(14, Math.round(requestedDayCount) || 1));
  const roundStep = Math.max(1, Math.min(25, Math.round(requestedRoundStep) || 5));
  const dayCountClamped = Number.isFinite(requestedDayCount) ? dayCount !== Math.round(requestedDayCount) : false;
  const roundStepClamped = Number.isFinite(requestedRoundStep) ? roundStep !== Math.round(requestedRoundStep) : false;
  const excluded = new Set(
    Array.isArray(payload.excludeFoodIds) ? payload.excludeFoodIds.map((value) => String(value)) : []
  );

  const aggregate = new Map();

  for (const meal of meals) {
    const items = Array.isArray(meal?.items) ? meal.items : [];

    for (const item of items) {
      const itemId = String(item?.id || "").trim();
      if (!itemId || excluded.has(itemId)) {
        continue;
      }

      const grams = Math.max(0, Number(item.grams) || 0) * dayCount;
      const macros = sanitizeMacroSet(item.macros);
      const scaledMacros = {
        protein: macros.protein * dayCount,
        carb: macros.carb * dayCount,
        fat: macros.fat * dayCount,
        calories: macros.calories * dayCount
      };

      const previous = aggregate.get(itemId);
      if (!previous) {
        aggregate.set(itemId, {
          id: itemId,
          name: String(item?.name || itemId),
          type: String(item?.type || "other"),
          totalGramsRaw: grams,
          totalMacros: scaledMacros
        });
        continue;
      }

      previous.totalGramsRaw += grams;
      previous.totalMacros.protein += scaledMacros.protein;
      previous.totalMacros.carb += scaledMacros.carb;
      previous.totalMacros.fat += scaledMacros.fat;
      previous.totalMacros.calories += scaledMacros.calories;
    }
  }

  const items = Array.from(aggregate.values())
    .map((entry) => ({
      id: entry.id,
      name: entry.name,
      type: entry.type,
      totalGrams: roundToStep(entry.totalGramsRaw, roundStep),
      totalMacros: {
        protein: Math.round(entry.totalMacros.protein * 10) / 10,
        carb: Math.round(entry.totalMacros.carb * 10) / 10,
        fat: Math.round(entry.totalMacros.fat * 10) / 10,
        calories: Math.round(entry.totalMacros.calories)
      }
    }))
    .sort((a, b) => {
      const aOrder = TYPE_ORDER[a.type] || 999;
      const bOrder = TYPE_ORDER[b.type] || 999;
      if (aOrder !== bOrder) {
        return aOrder - bOrder;
      }

      return a.name.localeCompare(b.name, "tr");
    });

  if (!items.length) {
    throw new Error("Tum urunler dislandigi icin liste bos kaldi.");
  }

  const grouped = {
    protein: items.filter((item) => item.type === "protein"),
    carb: items.filter((item) => item.type === "carb"),
    fat: items.filter((item) => item.type === "fat"),
    other: items.filter((item) => !["protein", "carb", "fat"].includes(item.type))
  };

  const totals = items.reduce(
    (acc, item) => {
      acc.grams += item.totalGrams;
      acc.protein += item.totalMacros.protein;
      acc.carb += item.totalMacros.carb;
      acc.fat += item.totalMacros.fat;
      acc.calories += item.totalMacros.calories;
      return acc;
    },
    {
      grams: 0,
      protein: 0,
      carb: 0,
      fat: 0,
      calories: 0
    }
  );

  const checklistText = items
    .map((item) => `- [ ] ${item.name} - ${item.totalGrams} g (${item.type})`)
    .join("\n");

  return {
    summary: {
      mealCount: meals.length,
      requestedDayCount: Number.isFinite(requestedDayCount) ? requestedDayCount : null,
      dayCount,
      dayCountClamped,
      uniqueItemCount: items.length,
      requestedRoundStep: Number.isFinite(requestedRoundStep) ? requestedRoundStep : null,
      roundStep,
      roundStepClamped
    },
    totals: {
      grams: Math.round(totals.grams),
      protein: Math.round(totals.protein * 10) / 10,
      carb: Math.round(totals.carb * 10) / 10,
      fat: Math.round(totals.fat * 10) / 10,
      calories: Math.round(totals.calories)
    },
    grouped,
    items,
    checklistText
  };
}