import { macrosForItem, roundMacros, sumMacros } from "./macros.js";

const WEIGHTS = { protein: 2, carb: 1, fat: 1 };
const PORTION_MULTIPLIERS = [0.6, 0.8, 1, 1.2, 1.4, 1.6, 1.8];

function scoreAgainstTarget(current, target) {
  return (
    Math.abs(current.protein - target.protein) * WEIGHTS.protein +
    Math.abs(current.carb - target.carb) * WEIGHTS.carb +
    Math.abs(current.fat - target.fat) * WEIGHTS.fat
  );
}

function evaluateCombination(protein, carb, fat, target) {
  let best = null;

  for (const proteinFactor of PORTION_MULTIPLIERS) {
    for (const carbFactor of PORTION_MULTIPLIERS) {
      for (const fatFactor of PORTION_MULTIPLIERS) {
        const items = [
          { item: protein, grams: protein.defaultPortion * proteinFactor },
          { item: carb, grams: carb.defaultPortion * carbFactor },
          { item: fat, grams: fat.defaultPortion * fatFactor }
        ];

        const macroParts = items.map(({ item, grams }) => macrosForItem(item, grams));
        const total = sumMacros(macroParts);
        const score = scoreAgainstTarget(total, target);

        if (!best || score < best.score) {
          best = { score, total, items };
        }
      }
    }
  }

  return best;
}

function pickBestMeal(proteins, carbs, fats, target, blockedKey) {
  let bestMeal = null;

  for (const p of proteins) {
    for (const c of carbs) {
      for (const f of fats) {
        const comboKey = `${p.id}_${c.id}_${f.id}`;
        if (blockedKey && comboKey === blockedKey) {
          continue;
        }

        const candidate = evaluateCombination(p, c, f, target);
        if (!bestMeal || candidate.score < bestMeal.score) {
          bestMeal = {
            score: candidate.score,
            comboKey,
            items: candidate.items,
            macros: roundMacros(candidate.total)
          };
        }
      }
    }
  }

  return bestMeal;
}

function getPerMealTarget(dailyTarget, mealCount) {
  return {
    protein: dailyTarget.protein / mealCount,
    carb: dailyTarget.carb / mealCount,
    fat: dailyTarget.fat / mealCount
  };
}

export function buildMealPlan({ selectedFoods, dailyTarget, mealCount = 4 }) {
  const proteins = selectedFoods.filter((item) => item.type === "protein");
  const carbs = selectedFoods.filter((item) => item.type === "carb");
  const fats = selectedFoods.filter((item) => item.type === "fat");

  if (!proteins.length || !carbs.length || !fats.length) {
    throw new Error("Plan olusturmak icin en az 1 protein, 1 karbonhidrat ve 1 yag secilmelidir.");
  }

  const mealTarget = getPerMealTarget(dailyTarget, mealCount);
  const meals = [];

  for (let index = 0; index < mealCount; index += 1) {
    const blocked = index > 0 ? meals[index - 1].comboKey : null;
    const best = pickBestMeal(proteins, carbs, fats, mealTarget, blocked);

    meals.push({
      id: `meal_${index + 1}`,
      title: `Ogun ${index + 1}`,
      comboKey: best.comboKey,
      score: Math.round(best.score * 10) / 10,
      items: best.items.map(({ item, grams }) => ({
        id: item.id,
        name: item.name,
        type: item.type,
        grams: Math.round(grams),
        macros: roundMacros(macrosForItem(item, grams))
      })),
      macros: best.macros,
      target: roundMacros({
        protein: mealTarget.protein,
        carb: mealTarget.carb,
        fat: mealTarget.fat,
        calories: dailyTarget.calories / mealCount
      })
    });
  }

  const totals = roundMacros(
    meals.reduce(
      (acc, meal) => ({
        protein: acc.protein + meal.macros.protein,
        carb: acc.carb + meal.macros.carb,
        fat: acc.fat + meal.macros.fat,
        calories: acc.calories + meal.macros.calories
      }),
      { protein: 0, carb: 0, fat: 0, calories: 0 }
    )
  );

  return { meals, totals };
}

export function swapMealItem({ meal, slotType, selectedFoods }) {
  const alternatives = selectedFoods.filter(
    (food) => food.type === slotType && !meal.items.some((mealItem) => mealItem.id === food.id)
  );

  if (!alternatives.length) {
    throw new Error("Bu kategori icin degistirilebilecek alternatif bulunamadi.");
  }

  const fixedProtein = slotType === "protein" ? null : meal.items.find((item) => item.type === "protein");
  const fixedCarb = slotType === "carb" ? null : meal.items.find((item) => item.type === "carb");
  const fixedFat = slotType === "fat" ? null : meal.items.find((item) => item.type === "fat");

  let best = null;

  for (const alternative of alternatives) {
    const protein =
      slotType === "protein"
        ? { ...alternative, defaultPortion: alternative.defaultPortion }
        : selectedFoods.find((food) => food.id === fixedProtein.id);

    const carb =
      slotType === "carb"
        ? { ...alternative, defaultPortion: alternative.defaultPortion }
        : selectedFoods.find((food) => food.id === fixedCarb.id);

    const fat =
      slotType === "fat"
        ? { ...alternative, defaultPortion: alternative.defaultPortion }
        : selectedFoods.find((food) => food.id === fixedFat.id);

    const candidate = evaluateCombination(protein, carb, fat, meal.target);
    if (!best || candidate.score < best.score) {
      best = {
        score: candidate.score,
        items: candidate.items,
        comboKey: `${protein.id}_${carb.id}_${fat.id}`,
        macros: roundMacros(candidate.total)
      };
    }
  }

  return {
    ...meal,
    comboKey: best.comboKey,
    score: Math.round(best.score * 10) / 10,
    items: best.items.map(({ item, grams }) => ({
      id: item.id,
      name: item.name,
      type: item.type,
      grams: Math.round(grams),
      macros: roundMacros(macrosForItem(item, grams))
    })),
    macros: best.macros
  };
}
