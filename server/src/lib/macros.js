const GOAL_SETTINGS = {
  cut: { proteinPerKg: 2.0, minFatPerKg: 0.7, fatShare: 0.28 },
  bulk: { proteinPerKg: 1.6, minFatPerKg: 0.8, fatShare: 0.25 },
  maintain: { proteinPerKg: 1.8, minFatPerKg: 0.8, fatShare: 0.3 }
};

export function estimateCalories({ weightKg = 75, heightCm = 175, goal = "maintain" }) {
  const base = 10 * Number(weightKg) + 6.25 * Number(heightCm) - 5 * 28 + 5;

  if (goal === "cut") return Math.round(base * 1.35 - 300);
  if (goal === "bulk") return Math.round(base * 1.45 + 250);
  return Math.round(base * 1.4);
}

export function dailyMacroTargets({ calories, goal = "maintain", weightKg = 75 }) {
  const safeWeight = Math.max(40, Number(weightKg) || 75);
  const settings = GOAL_SETTINGS[goal] ?? GOAL_SETTINGS.maintain;

  let protein = safeWeight * settings.proteinPerKg;
  const proteinCap = (calories * 0.35) / 4;
  protein = Math.min(protein, proteinCap);

  const minFat = safeWeight * settings.minFatPerKg;
  let fat = Math.max(minFat, (calories * settings.fatShare) / 9);

  let remainingCalories = calories - protein * 4 - fat * 9;

  if (remainingCalories < 0) {
    fat = minFat;
    remainingCalories = calories - protein * 4 - fat * 9;
  }

  if (remainingCalories < 0) {
    const maxProteinByEnergy = Math.max(0, (calories - fat * 9) / 4);
    const minProtein = safeWeight * 1.2;
    protein = Math.max(Math.min(protein, maxProteinByEnergy), Math.min(minProtein, maxProteinByEnergy));
    remainingCalories = Math.max(0, calories - protein * 4 - fat * 9);
  }

  const carb = remainingCalories / 4;

  return {
    calories,
    protein,
    carb,
    fat
  };
}

export function macrosForItem(item, grams) {
  const factor = grams / 100;
  return {
    protein: item.protein * factor,
    carb: item.carb * factor,
    fat: item.fat * factor,
    calories: item.calories * factor
  };
}

export function sumMacros(items) {
  return items.reduce(
    (acc, current) => ({
      protein: acc.protein + current.protein,
      carb: acc.carb + current.carb,
      fat: acc.fat + current.fat,
      calories: acc.calories + current.calories
    }),
    { protein: 0, carb: 0, fat: 0, calories: 0 }
  );
}

export function roundMacros(macros) {
  return {
    protein: Math.round(macros.protein * 10) / 10,
    carb: Math.round(macros.carb * 10) / 10,
    fat: Math.round(macros.fat * 10) / 10,
    calories: Math.round(macros.calories)
  };
}
