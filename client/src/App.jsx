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

  const selectedCount = selectedFoodIds.length;
  const featuredMeals = plan?.meals?.slice(0, 3) ?? [];

  const visualCards = featuredMeals.length
    ? featuredMeals.map((meal) => {
        const protein = meal.items.find((item) => item.type === "protein")?.name || "Protein";
        const carb = meal.items.find((item) => item.type === "carb")?.name || "Carb";
        return {
          title: meal.title,
          subtitle: `${protein} + ${carb}`,
          meta: `${meal.macros.calories} kcal`
        };
      })
    : [
        { title: "Awake Plan", subtitle: "High Protein Flow", meta: "Balanced" },
        { title: "Best Day", subtitle: "Lean + Carb Sync", meta: "Cut Mode" },
        { title: "Beautiful", subtitle: "Premium Macro Mix", meta: "Smart" }
      ];

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
    <main className="app-shell">
      <div className="atmosphere" />

      <div className="app-layout">
        <aside className="side-rail panel-glass">
          <div className="brand-block">
            <p className="kicker">Meal Planner + Macro Engine</p>
            <h1 className="brand-title">Meal Forge</h1>
            <p className="brand-copy">Premium planlama paneli ile ogunlerini hizli ve dengeli kur.</p>
          </div>

          <nav className="rail-nav">
            <button type="button" className="rail-nav-item is-active">Workspace</button>
            <button type="button" className="rail-nav-item">Ingredients</button>
            <button type="button" className="rail-nav-item">Macro View</button>
            <button type="button" className="rail-nav-item">Swap Assistant</button>
          </nav>

          <div className="rail-stats">
            <article className="rail-stat stat-green">
              <span>Secilen</span>
              <strong>{selectedCount}</strong>
            </article>
            <article className="rail-stat stat-blue">
              <span>Ogun</span>
              <strong>{mealCount}</strong>
            </article>
            <article className="rail-stat stat-orange">
              <span>Hedef</span>
              <strong>{profile.goal}</strong>
            </article>
            <article className="rail-stat stat-purple">
              <span>Kalori</span>
              <strong>{profile.calorieMode === "manual" ? profile.calories : "auto"}</strong>
            </article>
          </div>

          <button className="generate-btn rail-generate" disabled={loading || !canGenerate} onClick={generatePlan}>
            {loading ? "Hesaplaniyor..." : "Plan Olustur"}
          </button>
        </aside>

        <section className="main-stage">
          <header className="topbar panel-glass">
            <div>
              <p className="hero-kicker">Smart Nutrition Console</p>
              <h2 className="hero-title">Meal Studio</h2>
            </div>

            <div className="topbar-actions">
              <button type="button" className="icon-action" aria-label="notifications">•</button>
              <button type="button" className="icon-action" aria-label="analytics">◦</button>
              <button type="button" className="icon-action" aria-label="settings">◌</button>
            </div>
          </header>

          <section className="feature-strip">
            {visualCards.map((card, index) => (
              <article key={`${card.title}_${index}`} className={`feature-card feature-tone-${index % 3}`}>
                <div className="feature-overlay" />
                <p className="feature-kicker">Featured</p>
                <h3 className="feature-title">{card.title}</h3>
                <p className="feature-subtitle">{card.subtitle}</p>
                <span className="feature-meta">{card.meta}</span>
              </article>
            ))}
          </section>

          <header className="hero-panel panel-glass">
            <div>
              <p className="hero-kicker">Plan Studio</p>
              <h2 className="hero-title">Modular Meal Intelligence</h2>
              <p className="hero-copy">
                Malzeme sec, hedefini belirle, sistem otomatik ogun kombinlerini optimize etsin.
              </p>
            </div>

            <div className="hero-metrics">
              <article className="metric-chip chip-green">
                <span>Protein</span>
                <strong>{plan?.dailyTarget?.protein ? `${Math.round(plan.dailyTarget.protein)}g` : "--"}</strong>
              </article>
              <article className="metric-chip chip-blue">
                <span>Carb</span>
                <strong>{plan?.dailyTarget?.carb ? `${Math.round(plan.dailyTarget.carb)}g` : "--"}</strong>
              </article>
              <article className="metric-chip chip-orange">
                <span>Fat</span>
                <strong>{plan?.dailyTarget?.fat ? `${Math.round(plan.dailyTarget.fat)}g` : "--"}</strong>
              </article>
              <article className="metric-chip chip-purple">
                <span>Calories</span>
                <strong>{plan?.dailyTarget?.calories || "--"}</strong>
              </article>
            </div>
          </header>

          {error ? <p className="error-banner">{error}</p> : null}

          <section className="workspace-grid">
            <div className="workspace-left">
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
            </div>

            <div className="workspace-right">
              <MacroSummary totals={plan?.totals} target={plan?.dailyTarget} />
            {!plan ? (
                <section className="panel empty-panel">
                <h2 className="panel-title">Plan Ciktisi</h2>
                  <p className="panel-copy">
                  Sag tarafta ogun kartlarini gormek icin once soldan malzemelerini sec ve plan olustur.
                </p>
              </section>
            ) : (
              plan.meals.map((meal) => <MealCard key={meal.id} meal={meal} onSwap={handleSwap} />)
            )}
          </div>
          </section>
        </section>
      </div>
    </main>
  );
}
