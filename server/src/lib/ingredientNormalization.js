const UNIT_ALIASES = {
  gram: ["g", "gr", "gram", "grams"],
  kilogram: ["kg", "kilogram", "kilograms"],
  piece: ["piece", "pieces", "adet"],
  cup: ["cup", "cups", "bardak", "fincan", "su_bardagi"]
};

const ALIAS_TO_CANONICAL_ID = {
  chicken: "chicken",
  tavuk: "chicken",
  chicken_breast: "chicken",
  tavuk_gogus: "chicken",
  rice: "rice",
  white_rice: "rice",
  pirinc: "rice",
  pilavlik_pirinc: "rice",
  egg: "egg",
  eggs: "egg",
  yumurta: "egg",
  whole_egg: "egg",
  egg_white: "egg_white",
  yumurta_aki: "egg_white",
  egg_yolk: "egg_yolk",
  yumurta_sarisi: "egg_yolk",
  olive_oil: "olive_oil",
  zeytinyagi: "olive_oil",
  butter: "butter",
  tereyagi: "butter",
  banana: "banana",
  muz: "banana",
  apple: "apple",
  elma: "apple",
  broccoli: "broccoli",
  brokoli: "broccoli",
  salmon: "salmon",
  somon: "salmon",
  beef: "beef_lean",
  lean_beef: "beef_lean",
  dana: "beef_lean",
  yagsiz_dana: "beef_lean",
  oats: "oats",
  yulaf: "oats"
};

const PORTION_GRAMS_BY_FOOD_ID = {
  egg: {
    piece: 50
  },
  rice: {
    cup: 180
  },
  rice_raw: {
    cup: 180
  }
};

const UNIT_LOOKUP = Object.entries(UNIT_ALIASES).reduce((acc, [canonicalUnit, variants]) => {
  for (const variant of variants) {
    acc[variant] = canonicalUnit;
  }
  return acc;
}, {});

function normalizeText(text) {
  return String(text || "")
    .toLocaleLowerCase("tr")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function normalizeKey(text) {
  return normalizeText(text).replace(/\s+/g, "_");
}

function buildFoodIndexes(foods) {
  const byId = new Map();
  const byName = new Map();

  for (const food of foods) {
    const normalizedId = normalizeKey(food.id);
    const normalizedName = normalizeText(food.name);

    byId.set(normalizedId, food);
    byName.set(normalizedName, food);
  }

  return { byId, byName };
}

function resolveAliasFood(query, foods, indexes) {
  const aliasKey = normalizeKey(query);
  const canonicalId = ALIAS_TO_CANONICAL_ID[aliasKey];
  if (!canonicalId) {
    return null;
  }

  const direct = foods.find((food) => food.id === canonicalId);
  if (direct) {
    return { food: direct, matchedBy: "alias" };
  }

  const normalizedAliasId = normalizeKey(canonicalId);
  const byId = indexes.byId.get(normalizedAliasId);
  if (byId) {
    return { food: byId, matchedBy: "alias" };
  }

  return null;
}

export function resolveIngredientQuery(query, foods, options = {}) {
  const safeFoods = Array.isArray(foods) ? foods : [];
  const safeQuery = normalizeText(query);
  const strict = Boolean(options.strict);

  if (!safeQuery || !safeFoods.length) {
    return null;
  }

  const indexes = buildFoodIndexes(safeFoods);

  const aliasMatch = resolveAliasFood(safeQuery, safeFoods, indexes);
  if (aliasMatch) {
    return aliasMatch;
  }

  const exactName = indexes.byName.get(safeQuery);
  if (exactName) {
    return { food: exactName, matchedBy: "name_exact" };
  }

  const exactId = indexes.byId.get(normalizeKey(safeQuery));
  if (exactId) {
    return { food: exactId, matchedBy: "id_exact" };
  }

  if (strict) {
    return null;
  }

  let best = null;
  for (const food of safeFoods) {
    const normalizedName = normalizeText(food.name);
    if (!normalizedName) {
      continue;
    }

    let score = -1;
    if (normalizedName.startsWith(safeQuery)) {
      score = 3;
    } else if (normalizedName.includes(safeQuery)) {
      score = 2;
    } else if (safeQuery.includes(normalizedName)) {
      score = 1;
    }

    if (score < 0) {
      continue;
    }

    if (!best || score > best.score || (score === best.score && food.name.length < best.food.name.length)) {
      best = { food, score };
    }
  }

  if (!best) {
    return null;
  }

  return { food: best.food, matchedBy: "name_partial" };
}

function parseNumericPrefix(rawExpression) {
  const compact = String(rawExpression || "").trim().replace(/(\d)([a-zA-Z])/g, "$1 $2");
  const match = compact.match(/^(\d+(?:[.,]\d+)?)\s*(.*)$/);
  if (!match) {
    return null;
  }

  const quantity = Number(String(match[1]).replace(",", "."));
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return null;
  }

  return {
    quantity,
    tail: match[2] || ""
  };
}

function unitForToken(token) {
  return UNIT_LOOKUP[normalizeKey(token)] || null;
}

function gramsPerUnit(food, unit) {
  if (!food || !unit) {
    return null;
  }

  if (unit === "gram") {
    return 1;
  }

  if (unit === "kilogram") {
    return 1000;
  }

  const override = PORTION_GRAMS_BY_FOOD_ID[food.id]?.[unit];
  if (Number.isFinite(override) && override > 0) {
    return override;
  }

  if (unit === "piece" || unit === "cup") {
    const defaultPortion = Number(food.defaultPortion) || 0;
    return defaultPortion > 0 ? defaultPortion : null;
  }

  return null;
}

function roundTo(value, precision) {
  const multiplier = 10 ** precision;
  return Math.round(value * multiplier) / multiplier;
}

export function resolvePortionExpression(expression, foods) {
  const rawExpression = String(expression || "").trim();
  if (!rawExpression) {
    return null;
  }

  const parsed = parseNumericPrefix(rawExpression);
  if (!parsed) {
    return null;
  }

  const normalizedTail = normalizeText(parsed.tail);
  const parts = normalizedTail.split(" ").filter(Boolean);

  if (!parts.length) {
    return null;
  }

  const explicitUnit = unitForToken(parts[0]);
  let unit = explicitUnit || "gram";
  let ingredientQuery = parts.slice(1).join(" ");

  if (!explicitUnit) {
    ingredientQuery = parts.join(" ");
  }

  // "1 egg" / "1 yumurta" -> piece + egg
  const firstPartAlias = ALIAS_TO_CANONICAL_ID[normalizeKey(parts[0])];
  if (!ingredientQuery && firstPartAlias && !explicitUnit) {
    unit = "piece";
    ingredientQuery = parts[0];
  }

  if (!ingredientQuery) {
    return null;
  }

  const matched = resolveIngredientQuery(ingredientQuery, foods, { strict: false });
  if (!matched) {
    return null;
  }

  if (!explicitUnit && unit === "gram" && PORTION_GRAMS_BY_FOOD_ID[matched.food.id]?.piece) {
    unit = "piece";
  }

  const perUnit = gramsPerUnit(matched.food, unit);
  if (!Number.isFinite(perUnit) || perUnit <= 0) {
    return null;
  }

  const grams = roundTo(parsed.quantity * perUnit, 2);
  return {
    quantity: roundTo(parsed.quantity, 3),
    unit,
    grams,
    food: matched.food,
    matchedBy: matched.matchedBy
  };
}
