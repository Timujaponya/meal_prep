import { useEffect, useMemo, useState } from "react";
import IngredientSelector from "./components/IngredientSelector.jsx";
import MacroSummary from "./components/MacroSummary.jsx";
import MealCard from "./components/MealCard.jsx";
import ProfileForm from "./components/ProfileForm.jsx";
import { api } from "./lib/api.js";

function hasMinimumSelection(selectedIds, foods) {
  const selectedFoods = foods.filter((food) => selectedIds.includes(food.id));
  const types = new Set(selectedFoods.map((food) => food.type));
  return types.has("protein") && types.has("carb") && types.has("fat");
}

function recalculateTotals(meals) {
  return meals.reduce(
    (acc, meal) => ({
      protein: Math.round((acc.protein + meal.macros.protein) * 10) / 10,
      carb: Math.round((acc.carb + meal.macros.carb) * 10) / 10,
      fat: Math.round((acc.fat + meal.macros.fat) * 10) / 10,
      calories: Math.round(acc.calories + meal.macros.calories)
    }),
    { protein: 0, carb: 0, fat: 0, calories: 0 }
  );
}

export default function App() {
  const [foods, setFoods] = useState([]);
  const [selectedFoodIds, setSelectedFoodIds] = useState([]);
  const [profile, setProfile] = useState({
    weightKg: 78,
    heightCm: 178,
    goal: "cut",
    calorieMode: "auto",
    calories: 2200
  });
  const [mealCount, setMealCount] = useState(4);
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [ingredientBusy, setIngredientBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function initFoods() {
      try {
        const data = await api.getFoods();
        setFoods(data.foods);
        setSelectedFoodIds(data.foods.map((food) => food.id));
      } catch (initError) {
        setError(initError.message);
      }
    }

    initFoods();
  }, []);

  const canGenerate = useMemo(
    () => foods.length > 0 && hasMinimumSelection(selectedFoodIds, foods),
    [foods, selectedFoodIds]
  );

  function handleProfileChange(key, value) {
    setProfile((current) => ({ ...current, [key]: value }));
  }

  function toggleFood(foodId) {
    setSelectedFoodIds((current) =>
      current.includes(foodId) ? current.filter((id) => id !== foodId) : [...current, foodId]
    );
  }

  function removeFromSelection(foodId) {
    setSelectedFoodIds((current) => current.filter((id) => id !== foodId));
  }

  function planUsesFood(currentPlan, foodId) {
    return Boolean(currentPlan?.meals.some((meal) => meal.items.some((item) => item.id === foodId)));
  }

  async function handleAddFood(foodInput) {
    setIngredientBusy(true);
    setError("");

    try {
      const payload = await api.addFood(foodInput);
      setFoods(payload.foods);
      setSelectedFoodIds((current) => [...new Set([...current, payload.food.id])]);
    } catch (addError) {
      setError(addError.message);
    } finally {
      setIngredientBusy(false);
    }
  }

  async function handleRemoveFood(foodId) {
    setIngredientBusy(true);
    setError("");

    try {
      const shouldResetPlan = planUsesFood(plan, foodId);
      const payload = await api.removeFood(foodId);
      setFoods(payload.foods);
      removeFromSelection(foodId);

      if (shouldResetPlan) {
        setPlan(null);
        setError("Silinen malzeme mevcut planda kullanildigi icin plan sifirlandi. Lutfen yeniden olustur.");
      }
    } catch (removeError) {
      setError(removeError.message);
    } finally {
      setIngredientBusy(false);
    }
  }

  async function generatePlan() {
    if (!canGenerate) {
      setError("Plan olusturmak icin her kategoriden en az bir malzeme secmelisin.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const payload = await api.generatePlan({
        profile,
        selectedFoodIds,
        mealCount
      });

      setPlan(payload);
    } catch (planError) {
      setError(planError.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSwap(mealId, slotType) {
    if (!plan) return;

    const meal = plan.meals.find((entry) => entry.id === mealId);
    if (!meal) return;

    setLoading(true);
    setError("");

    try {
      const payload = await api.swapMealItem({
        meal,
        slotType,
        selectedFoodIds
      });

      const updatedMeals = plan.meals.map((entry) => (entry.id === mealId ? payload.meal : entry));

      setPlan((current) => ({
        ...current,
        meals: updatedMeals,
        totals: recalculateTotals(updatedMeals)
      }));
    } catch (swapError) {
      setError(swapError.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-cream text-ink">
      <div className="atmosphere" />

      <div className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-12">
        <header className="mb-8 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="kicker">Meal Planner + Macro Engine</p>
            <h1 className="font-display text-4xl leading-none md:text-6xl">Meal Forge</h1>
          </div>
          <button className="generate-btn" disabled={loading || !canGenerate} onClick={generatePlan}>
            {loading ? "Hesaplaniyor..." : "Plan Olustur"}
          </button>
        </header>

        {error ? <p className="mb-4 rounded-lg bg-red-100 px-4 py-3 text-red-800">{error}</p> : null}

        <section className="grid gap-4 lg:grid-cols-[380px_1fr]">
          <div className="space-y-4">
            <ProfileForm
              profile={profile}
              onChange={handleProfileChange}
              mealCount={mealCount}
              onMealCountChange={(value) => setMealCount(Math.max(3, Math.min(6, value || 4)))}
            />
            <IngredientSelector
              foods={foods}
              selectedIds={selectedFoodIds}
              onToggle={toggleFood}
              onAddFood={handleAddFood}
              onRemoveFood={handleRemoveFood}
              busy={ingredientBusy}
            />
            <MacroSummary totals={plan?.totals} target={plan?.dailyTarget} />
          </div>

          <div className="space-y-4">
            {!plan ? (
              <section className="panel h-full min-h-[360px]">
                <h2 className="panel-title">Plan Ciktisi</h2>
                <p className="text-ink/70">
                  Sag tarafta ogun kartlarini gormek icin once soldan malzemelerini sec ve plan olustur.
                </p>
              </section>
            ) : (
              plan.meals.map((meal) => <MealCard key={meal.id} meal={meal} onSwap={handleSwap} />)
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
