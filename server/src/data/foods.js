export const foodItems = [
  { id: "chicken", name: "Tavuk Gogus", type: "protein", protein: 31, carb: 0, fat: 3.6, calories: 165, defaultPortion: 120 },
  { id: "turkey", name: "Hindi", type: "protein", protein: 29, carb: 0, fat: 1.5, calories: 135, defaultPortion: 120 },
  { id: "beef_lean", name: "Yagsiz Dana", type: "protein", protein: 26, carb: 0, fat: 10, calories: 210, defaultPortion: 110 },
  { id: "salmon", name: "Somon", type: "protein", protein: 24, carb: 0, fat: 13, calories: 208, defaultPortion: 120 },
  { id: "egg", name: "Yumurta", type: "protein", protein: 13, carb: 1.1, fat: 11, calories: 155, defaultPortion: 100 },

  { id: "rice", name: "Pirinç", type: "carb", protein: 2.7, carb: 28, fat: 0.3, calories: 130, defaultPortion: 160 },
  { id: "oats", name: "Yulaf", type: "carb", protein: 13, carb: 68, fat: 7, calories: 389, defaultPortion: 80 },
  { id: "potato", name: "Patates", type: "carb", protein: 2, carb: 17, fat: 0.1, calories: 77, defaultPortion: 220 },
  { id: "pasta", name: "Makarna", type: "carb", protein: 5.8, carb: 31, fat: 1.1, calories: 158, defaultPortion: 150 },
  { id: "quinoa", name: "Kinoa", type: "carb", protein: 4.4, carb: 21, fat: 1.9, calories: 120, defaultPortion: 150 },

  { id: "olive_oil", name: "Zeytinyagi", type: "fat", protein: 0, carb: 0, fat: 100, calories: 884, defaultPortion: 12 },
  { id: "avocado", name: "Avokado", type: "fat", protein: 2, carb: 9, fat: 15, calories: 160, defaultPortion: 70 },
  { id: "almond", name: "Badem", type: "fat", protein: 21, carb: 22, fat: 50, calories: 579, defaultPortion: 28 },
  { id: "peanut_butter", name: "Fistik Ezmesi", type: "fat", protein: 25, carb: 20, fat: 50, calories: 588, defaultPortion: 24 },
  { id: "walnut", name: "Ceviz", type: "fat", protein: 15, carb: 14, fat: 65, calories: 654, defaultPortion: 20 }
];

function slugifyName(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s_-]/g, "")
    .replace(/\s+/g, "_");
}

function buildUniqueId(name) {
  const base = slugifyName(name) || "food";
  if (!foodItems.some((item) => item.id === base)) {
    return base;
  }

  let index = 2;
  while (foodItems.some((item) => item.id === `${base}_${index}`)) {
    index += 1;
  }

  return `${base}_${index}`;
}

function sanitizeNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

export function createFoodItem(payload) {
  const validTypes = ["protein", "carb", "fat"];
  const name = String(payload?.name || "").trim();
  const type = String(payload?.type || "").trim();

  if (!name) {
    throw new Error("Malzeme adi zorunludur.");
  }

  if (!validTypes.includes(type)) {
    throw new Error("Malzeme tipi protein, carb veya fat olmalidir.");
  }

  const protein = sanitizeNumber(payload?.protein);
  const carb = sanitizeNumber(payload?.carb);
  const fat = sanitizeNumber(payload?.fat);
  const defaultPortion = Math.max(1, Math.round(sanitizeNumber(payload?.defaultPortion || 100)));
  const calculatedCalories = protein * 4 + carb * 4 + fat * 9;
  const calories = sanitizeNumber(payload?.calories) || Math.round(calculatedCalories);

  const nextItem = {
    id: buildUniqueId(name),
    name,
    type,
    protein,
    carb,
    fat,
    calories,
    defaultPortion
  };

  foodItems.push(nextItem);
  return nextItem;
}

export function removeFoodItemById(foodId) {
  const index = foodItems.findIndex((item) => item.id === foodId);
  if (index === -1) {
    throw new Error("Silinecek malzeme bulunamadi.");
  }

  const itemToRemove = foodItems[index];
  const sameTypeCount = foodItems.filter((item) => item.type === itemToRemove.type).length;
  if (sameTypeCount <= 1) {
    throw new Error("Son kalan kategori malzemesi silinemez.");
  }

  foodItems.splice(index, 1);
  return itemToRemove;
}
