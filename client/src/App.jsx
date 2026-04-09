import { useEffect, useMemo, useRef, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import BottomNav from "./components/BottomNav.jsx";
import CartDrawer from "./components/CartDrawer.jsx";
import CheckoutInsightsDrawer from "./components/CheckoutInsightsDrawer.jsx";
import ProfileAvatarMenu from "./components/ProfileAvatarMenu.jsx";
import ToastMessage from "./components/ToastMessage.jsx";
import { api, setAuthToken } from "./lib/api.js";
import DashboardPage from "./pages/DashboardPage.jsx";
import InventoryPage from "./pages/InventoryPage.jsx";
import LandingPage from "./pages/LandingPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import PlannerPage from "./pages/PlannerPage.jsx";
import ProfilePage from "./pages/ProfilePage.jsx";
import RecipesPage from "./pages/RecipesPage.jsx";
import SettingsPage from "./pages/SettingsPage.jsx";

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function waterTargetByWeight(weightKg) {
  const safeWeight = Math.max(40, Number(weightKg) || 78);
  return Math.max(1200, Math.min(5000, Math.round(safeWeight * 35)));
}

function shiftIsoDate(isoDate, dayDelta) {
  const base = new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(base.getTime())) {
    return todayIsoDate();
  }

  base.setDate(base.getDate() + dayDelta);
  return base.toISOString().slice(0, 10);
}

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

function AppShell({ user, onLogout, onNotify }) {
  const [foods, setFoods] = useState([]);
  const [recipesCatalog, setRecipesCatalog] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
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
  const [cartOpen, setCartOpen] = useState(false);
  const [cartItems, setCartItems] = useState([]);
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [checkoutFeedback, setCheckoutFeedback] = useState(null);
  const [insightsOpen, setInsightsOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(todayIsoDate());
  const [dayLog, setDayLog] = useState(null);
  const [dayLogBusy, setDayLogBusy] = useState(false);
  const [waterBusy, setWaterBusy] = useState(false);
  const [inventoryBusy, setInventoryBusy] = useState(false);
  const [error, setError] = useState("");
  const location = useLocation();

  useEffect(() => {
    async function initData() {
      try {
        const [foodsResult, inventoryResult, recipesResult] = await Promise.allSettled([
          api.getFoods(),
          api.getInventory(),
          api.getRecipes()
        ]);

        const nextFoods =
          foodsResult.status === "fulfilled" && Array.isArray(foodsResult.value?.foods)
            ? foodsResult.value.foods
            : [];
        const nextInventory =
          inventoryResult.status === "fulfilled" && Array.isArray(inventoryResult.value?.items)
            ? inventoryResult.value.items
            : [];
        const nextRecipes =
          recipesResult.status === "fulfilled" && Array.isArray(recipesResult.value?.recipes)
            ? recipesResult.value.recipes
            : [];

        setFoods(nextFoods);
        setInventoryItems(nextInventory);
        setRecipesCatalog(nextRecipes);
        setSelectedFoodIds(nextInventory.filter((item) => Number(item.amountGrams) > 0).map((item) => item.id));

        const failedSources = [];
        if (foodsResult.status === "rejected") failedSources.push("foods");
        if (inventoryResult.status === "rejected") failedSources.push("inventory");
        if (recipesResult.status === "rejected") failedSources.push("recipes");

        if (failedSources.length) {
          setError(`Bazi veriler yuklenemedi: ${failedSources.join(", ")}`);
        }
      } catch (initError) {
        setError(initError.message);
      }
    }

    initData();
  }, []);

  async function refreshRecipesCatalog() {
    try {
      const payload = await api.getRecipes();
      setRecipesCatalog(Array.isArray(payload?.recipes) ? payload.recipes : []);
    } catch (_error) {
      // Dashboard fallback recipes will be used on failures.
    }
  }

  useEffect(() => {
    async function loadDayLog() {
      try {
        const targetMl = waterTargetByWeight(profile.weightKg);
        const payload = await api.getDayLog(selectedDate, targetMl);
        setDayLog(payload);
      } catch (loadError) {
        setError(loadError.message);
      }
    }

    loadDayLog();
  }, [profile.weightKg, selectedDate]);

  const selectableInventoryFoodIds = useMemo(
    () => inventoryItems.filter((item) => Number(item.amountGrams) > 0).map((item) => item.id),
    [inventoryItems]
  );

  const selectableInventoryFoodSet = useMemo(() => new Set(selectableInventoryFoodIds), [selectableInventoryFoodIds]);

  useEffect(() => {
    setSelectedFoodIds((current) => current.filter((id) => selectableInventoryFoodSet.has(id)));
  }, [selectableInventoryFoodSet]);

  const canGenerate = useMemo(
    () => foods.length > 0 && hasMinimumSelection(selectedFoodIds, foods),
    [foods, selectedFoodIds]
  );

  function upsertCartItem(nextItem) {
    setCartItems((current) => {
      const foundIndex = current.findIndex((item) => item.id === nextItem.id);

      if (foundIndex === -1) {
        return [...current, { ...nextItem, qty: 1 }];
      }

      const cloned = [...current];
      cloned[foundIndex] = {
        ...cloned[foundIndex],
        qty: cloned[foundIndex].qty + 1
      };
      return cloned;
    });
    setCartOpen(true);
  }

  function handleAddRecipeToCart(recipe) {
    upsertCartItem({
      id: `recipe_${recipe.id}`,
      title: recipe.title,
      calories: recipe.calories,
      protein: recipe.protein,
      carb: recipe.carb,
      fat: recipe.fat,
      ingredientIds: Array.isArray(recipe.ingredients) ? recipe.ingredients.map((entry) => entry.foodId) : [],
      ingredientBreakdown: Array.isArray(recipe.ingredients)
        ? recipe.ingredients.map((entry) => ({ id: entry.foodId, grams: Number(entry.grams) || 0 }))
        : []
    });
  }

  function handleAddMealToCart(meal) {
    upsertCartItem({
      id: `meal_${meal.id}`,
      title: meal.title,
      calories: Math.round(meal.macros?.calories || meal.calories || 0),
      protein: Math.round(meal.macros?.protein || meal.protein || 0),
      carb: Math.round(meal.macros?.carb || meal.carb || 0),
      fat: Math.round(meal.macros?.fat || meal.fat || 0),
      ingredientIds: Array.isArray(meal.items) ? meal.items.map((item) => item.id) : [],
      ingredientBreakdown: Array.isArray(meal.items)
        ? meal.items.map((item) => ({ id: item.id, grams: Number(item.grams) || 0 }))
        : []
    });
  }

  function increaseCartItem(itemId) {
    setCartItems((current) =>
      current.map((item) => (item.id === itemId ? { ...item, qty: item.qty + 1 } : item))
    );
  }

  function decreaseCartItem(itemId) {
    setCartItems((current) =>
      current
        .map((item) => (item.id === itemId ? { ...item, qty: item.qty - 1 } : item))
        .filter((item) => item.qty > 0)
    );
  }

  function removeCartItem(itemId) {
    setCartItems((current) => current.filter((item) => item.id !== itemId));
  }

  function clearCartItems() {
    setCartItems([]);
  }

  async function handleInventorySave(foodId, amountGrams) {
    setInventoryBusy(true);
    setError("");

    try {
      const payload = await api.upsertInventory({ foodId, amountGrams });
      setInventoryItems(payload.items);
      if (payload?.adjustment?.clamped) {
        onNotify(
          `Inventory guncellendi (uygulanan miktar: ${payload.adjustment.appliedAmountGrams} g).`,
          "info"
        );
      } else {
        onNotify("Inventory guncellendi.", "success");
      }
    } catch (inventoryError) {
      setError(inventoryError.message);
      onNotify(inventoryError.message, "error");
    } finally {
      setInventoryBusy(false);
    }
  }

  async function handleResolveInventoryPortion(expression) {
    const payload = await api.resolvePortionExpression(expression);
    return payload.resolved;
  }

  async function handleInventoryIncrement(foodId, deltaGrams) {
    setInventoryBusy(true);
    setError("");

    try {
      const payload = await api.incrementInventory({ foodId, deltaGrams });
      setInventoryItems(payload.items);

      if (payload?.adjustment?.clamped) {
        onNotify(
          `Inventory guncellendi (uygulanan miktar: ${payload.adjustment.appliedAmountGrams} g).`,
          "info"
        );
      } else {
        onNotify("Inventory guncellendi.", "success");
      }
    } catch (inventoryError) {
      setError(inventoryError.message);
      onNotify(inventoryError.message, "error");
    } finally {
      setInventoryBusy(false);
    }
  }

  function handleProfileChange(key, value) {
    setProfile((current) => ({ ...current, [key]: value }));
  }

  function toggleFood(foodId) {
    if (!selectableInventoryFoodSet.has(foodId)) {
      return;
    }

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
      await refreshRecipesCatalog();
      onNotify(payload.deduplicated ? "Malzeme mevcut ingredient ile eslendi." : "Malzeme eklendi.", "success");
    } catch (addError) {
      setError(addError.message);
      onNotify(addError.message, "error");
    } finally {
      setIngredientBusy(false);
    }
  }

  async function handleUpdateFood(foodId, foodInput) {
    setIngredientBusy(true);
    setError("");

    try {
      const payload = await api.updateFood(foodId, foodInput);
      setFoods(payload.foods);
      await refreshRecipesCatalog();
      onNotify("Malzeme guncellendi.", "success");
    } catch (updateError) {
      setError(updateError.message);
      onNotify(updateError.message, "error");
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
      await refreshRecipesCatalog();
      removeFromSelection(foodId);

      if (shouldResetPlan) {
        setPlan(null);
        setError("Silinen malzeme mevcut planda kullanildigi icin plan sifirlandi. Lutfen yeniden olustur.");
      }

      onNotify("Malzeme silindi.", "success");
    } catch (removeError) {
      setError(removeError.message);
      onNotify(removeError.message, "error");
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
        profile: { ...profile, calorieMode: "auto" },
        selectedFoodIds,
        mealCount
      });

      setPlan(payload);
      onNotify("Plan olusturuldu.", "success");
    } catch (planError) {
      setError(planError.message);
      onNotify(planError.message, "error");
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
      onNotify("Meal guncellendi.", "success");
    } catch (swapError) {
      setError(swapError.message);
      onNotify(swapError.message, "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleCheckoutCart() {
    if (!cartItems.length) {
      return;
    }

    setCheckoutBusy(true);
    setError("");

    try {
      const payload = await api.checkoutPlan({
        date: selectedDate,
        cartItems,
        selectedFoodIds,
        profile
      });

      setCheckoutFeedback(payload.analysis);
      setDayLog(payload.dayLog);
      setInsightsOpen(true);
      onNotify("Checkout analizi hazir.", "success");
    } catch (checkoutError) {
      setError(checkoutError.message);
      onNotify(checkoutError.message, "error");
    } finally {
      setCheckoutBusy(false);
    }
  }

  function handleMoveDate(dayDelta) {
    setSelectedDate((current) => shiftIsoDate(current, dayDelta));
  }

  async function handleAddWater(amountMl) {
    setWaterBusy(true);
    setError("");

    try {
      const payload = await api.addWater({
        date: selectedDate,
        amountMl,
        targetMl: waterTargetByWeight(profile.weightKg)
      });

      const waterPayload = payload?.water || payload;

      setDayLog((current) => ({
        ...(current || {}),
        date: selectedDate,
        meals: current?.meals || { date: selectedDate, entries: [], totals: { calories: 0, protein: 0, carb: 0, fat: 0 } },
        water: waterPayload
      }));

      if (payload?.adjustment?.clamped) {
        onNotify(`Su kaydi eklendi (uygulanan miktar: ${payload.adjustment.appliedAmountMl} ml).`, "info");
      } else {
        onNotify("Su kaydi eklendi.", "success");
      }
    } catch (waterError) {
      setError(waterError.message);
      onNotify(waterError.message, "error");
    } finally {
      setWaterBusy(false);
    }
  }

  async function handleUpdateDayLogEntry(sourceId, entry) {
    setDayLogBusy(true);
    setError("");

    try {
      const payload = await api.updateDayLogEntry({
        date: selectedDate,
        sourceId,
        entry,
        targetMl: waterTargetByWeight(profile.weightKg)
      });

      setDayLog(payload);
      onNotify("Daily tracking kaydi guncellendi.", "success");
    } catch (entryError) {
      setError(entryError.message);
      onNotify(entryError.message, "error");
    } finally {
      setDayLogBusy(false);
    }
  }

  async function handleAddDayLogEntry(entry) {
    setDayLogBusy(true);
    setError("");

    try {
      const payload = await api.addDayLogEntry({
        date: selectedDate,
        entry,
        targetMl: waterTargetByWeight(profile.weightKg)
      });

      setDayLog(payload);
      onNotify("Daily tracking kaydi eklendi.", "success");
    } catch (entryError) {
      setError(entryError.message);
      onNotify(entryError.message, "error");
    } finally {
      setDayLogBusy(false);
    }
  }

  async function handleDeleteDayLogEntry(sourceId) {
    setDayLogBusy(true);
    setError("");

    try {
      const payload = await api.deleteDayLogEntry(selectedDate, sourceId, waterTargetByWeight(profile.weightKg));
      setDayLog(payload);
      onNotify("Daily tracking kaydi silindi.", "success");
    } catch (entryError) {
      setError(entryError.message);
      onNotify(entryError.message, "error");
    } finally {
      setDayLogBusy(false);
    }
  }

  return (
    <main className="app-shell">
      <div className="atmosphere" />

      <div className="mobile-shell">
        <div className="app-top-actions">
          <ProfileAvatarMenu user={user} onLogout={onLogout} />
        </div>

        {error ? <p className="error-banner">{error}</p> : null}

        <div key={location.pathname} className="route-transition">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route
              path="/dashboard"
              element={
                <DashboardPage
                  plan={plan}
                  recipes={recipesCatalog}
                  onAddToCart={handleAddMealToCart}
                  selectedDate={selectedDate}
                  onDateChange={setSelectedDate}
                  onMoveDate={handleMoveDate}
                  dayLog={dayLog}
                  dayLogBusy={dayLogBusy}
                  onAddDayLogEntry={handleAddDayLogEntry}
                  onUpdateDayLogEntry={handleUpdateDayLogEntry}
                  onDeleteDayLogEntry={handleDeleteDayLogEntry}
                  onAddWater={handleAddWater}
                  waterBusy={waterBusy}
                />
              }
            />
            <Route
              path="/planner"
              element={
                <PlannerPage
                  userRole={user?.role}
                  profile={profile}
                  mealCount={mealCount}
                  setMealCount={setMealCount}
                  foods={foods}
                  selectableFoodIds={selectableInventoryFoodIds}
                  selectedFoodIds={selectedFoodIds}
                  toggleFood={toggleFood}
                  addFood={handleAddFood}
                  updateFood={handleUpdateFood}
                  removeFood={handleRemoveFood}
                  ingredientBusy={ingredientBusy}
                  plan={plan}
                  onSwap={handleSwap}
                  onGenerate={generatePlan}
                  loading={loading}
                  canGenerate={canGenerate}
                  onProfileChange={handleProfileChange}
                  onAddMealToCart={handleAddMealToCart}
                />
              }
            />
            <Route path="/recipes" element={<RecipesPage onAddToCart={handleAddRecipeToCart} />} />
            <Route
              path="/inventory"
              element={
                <InventoryPage
                  items={inventoryItems}
                  catalog={foods}
                  onSaveAmount={handleInventorySave}
                  onIncrementAmount={handleInventoryIncrement}
                  onResolvePortion={handleResolveInventoryPortion}
                  busy={inventoryBusy}
                />
              }
            />
            <Route path="/profile" element={<ProfilePage user={user} />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </div>

        <BottomNav cartCount={cartItems.reduce((acc, item) => acc + item.qty, 0)} onOpenCart={() => setCartOpen(true)} />
      </div>

      <CartDrawer
        open={cartOpen}
        items={cartItems}
        onClose={() => setCartOpen(false)}
        onIncrement={increaseCartItem}
        onDecrement={decreaseCartItem}
        onRemove={removeCartItem}
        onClearAll={clearCartItems}
        onCheckout={handleCheckoutCart}
        onOpenInsights={() => setInsightsOpen(true)}
        hasInsights={Boolean(checkoutFeedback)}
        checkoutBusy={checkoutBusy}
      />

      <CheckoutInsightsDrawer open={insightsOpen} analysis={checkoutFeedback} onClose={() => setInsightsOpen(false)} />
    </main>
  );
}

function AppRouter() {
  const [authReady, setAuthReady] = useState(false);
  const [user, setUser] = useState(null);
  const [loginBusy, setLoginBusy] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [toast, setToast] = useState(null);
  const toastTimerRef = useRef(null);

  function showToast(message, type = "info") {
    setToast({ message, type });
    window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => {
      setToast(null);
    }, 2400);
  }

  useEffect(() => {
    return () => {
      window.clearTimeout(toastTimerRef.current);
    };
  }, []);

  useEffect(() => {
    async function bootstrapAuth() {
      const token = localStorage.getItem("mealforge_token");
      if (!token) {
        setAuthReady(true);
        return;
      }

      setAuthToken(token);

      try {
        const payload = await api.me();
        setUser(payload.user);
      } catch (_error) {
        localStorage.removeItem("mealforge_token");
        setAuthToken(null);
      } finally {
        setAuthReady(true);
      }
    }

    bootstrapAuth();
  }, []);

  async function handleLogin(credentials) {
    setLoginBusy(true);
    setLoginError("");

    try {
      const payload = await api.login(credentials);
      setAuthToken(payload.token);
      localStorage.setItem("mealforge_token", payload.token);
      setUser(payload.user);
      showToast("Giris basarili.", "success");
    } catch (error) {
      setLoginError(error.message);
      showToast(error.message, "error");
    } finally {
      setLoginBusy(false);
    }
  }

  async function handleRegister(credentials) {
    setLoginBusy(true);
    setLoginError("");

    try {
      const payload = await api.register(credentials);
      setAuthToken(payload.token);
      localStorage.setItem("mealforge_token", payload.token);
      setUser(payload.user);
      showToast("Kayit tamamlandi. Hos geldin!", "success");
    } catch (error) {
      setLoginError(error.message);
      showToast(error.message, "error");
    } finally {
      setLoginBusy(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem("mealforge_token");
    setAuthToken(null);
    setUser(null);
    showToast("Cikis yapildi.", "success");
  }

  if (!authReady) {
    return (
      <main className="landing-shell">
        <section className="panel panel-glass auth-card">
          <p className="screen-subtitle">Session kontrol ediliyor...</p>
        </section>
      </main>
    );
  }

  return (
    <>
      <ToastMessage toast={toast} />
      <Routes>
        <Route path="/landing" element={<LandingPage isAuthenticated={Boolean(user)} />} />
        <Route
          path="/login"
          element={
            user ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <LoginPage onLogin={handleLogin} onRegister={handleRegister} busy={loginBusy} error={loginError} />
            )
          }
        />
        <Route
          path="/*"
          element={user ? <AppShell user={user} onLogout={handleLogout} onNotify={showToast} /> : <Navigate to="/landing" replace />}
        />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRouter />
    </BrowserRouter>
  );
}
