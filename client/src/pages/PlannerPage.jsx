import IngredientSelector from "../components/IngredientSelector.jsx";
import MealCard from "../components/MealCard.jsx";
import ProfileForm from "../components/ProfileForm.jsx";

export default function PlannerPage({
  userRole,
  profile,
  mealCount,
  setMealCount,
  foods,
  selectableFoodIds,
  selectedFoodIds,
  toggleFood,
  addFood,
  updateFood,
  removeFood,
  ingredientBusy,
  plan,
  onSwap,
  onGenerate,
  loading,
  canGenerate,
  onProfileChange,
  onAddMealToCart
}) {
  return (
    <section className="page-screen">
      <header className="screen-top panel-glass">
        <div className="screen-top-main">
          <div>
            <p className="kicker">Meal Planner</p>
            <h1 className="screen-title">Meal Planner</h1>
            <p className="screen-subtitle">Engineer the perfect fuel for your performance.</p>
          </div>

          <div className="screen-actions" aria-hidden="true">
            <span className="action-dot action-dot-soft" />
            <span className="action-dot action-dot-strong" />
          </div>
        </div>

        <button className="generate-btn" disabled={loading || !canGenerate} onClick={onGenerate}>
          {loading ? "Hesaplaniyor..." : "Auto Generate"}
        </button>

        <div className="status-chip-row">
          <span className="status-chip status-chip-green">{mealCount} Meals</span>
          <span className="status-chip">{selectedFoodIds.length} Ingredients</span>
          <span className="status-chip">Goal {profile.goal}</span>
        </div>
      </header>

      <ProfileForm
        profile={profile}
        onChange={onProfileChange}
        mealCount={mealCount}
        onMealCountChange={(value) => setMealCount(Math.max(3, Math.min(6, value || 4)))}
      />

      <IngredientSelector
        canManageFoods={userRole === "admin"}
        foods={foods}
        selectableFoodIds={selectableFoodIds}
        selectedIds={selectedFoodIds}
        onToggle={toggleFood}
        onAddFood={addFood}
        onUpdateFood={updateFood}
        onRemoveFood={removeFood}
        busy={ingredientBusy}
      />

      <section className="plan-section panel-glass">
        <div className="section-head">
          <h2 className="section-title">Generated Meals</h2>
          <span className="section-meta">{plan ? `${plan.meals.length} items` : "No plan"}</span>
        </div>

        {!plan ? (
          <div className="empty-plan">
            <p>Plan ciktilari burada gorunecek. Auto Generate ile yemek seti olustur.</p>
          </div>
        ) : (
          <div className="meal-feed">
            {plan.meals.map((meal, index) => (
              <MealCard key={meal.id} meal={meal} onSwap={onSwap} index={index} onAddToCart={onAddMealToCart} />
            ))}
          </div>
        )}
      </section>
    </section>
  );
}
