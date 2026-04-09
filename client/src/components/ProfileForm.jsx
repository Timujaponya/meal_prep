import NumberStepper from "./NumberStepper.jsx";

export default function ProfileForm({ profile, onChange, mealCount, onMealCountChange }) {
  const goals = [
    { value: "cut", label: "Fat Loss" },
    { value: "bulk", label: "Muscle Gain" },
    { value: "maintain", label: "Maintenance" }
  ];

  const calories = Number(profile.calories || 2150);
  const minCalories = 1800;
  const maxCalories = 4200;

  const safeWeight = Math.max(30, Number(profile.weightKg) || 30);
  const safeHeight = Math.max(120, Number(profile.heightCm) || 120);
  const safeMealCount = Math.max(3, Math.min(6, Number(mealCount) || 4));

  return (
    <section className="panel panel-glass">
      <div className="section-head">
        <h2 className="section-title">Performance Goal</h2>
        <span className="section-meta">{mealCount} meals</span>
      </div>

      <div className="goal-grid">
        {goals.map((goal) => (
          <button
            key={goal.value}
            type="button"
            className={`goal-pill ${profile.goal === goal.value ? "goal-pill-active" : ""}`}
            onClick={() => onChange("goal", goal.value)}
          >
            {goal.label}
          </button>
        ))}
      </div>

      <div className="energy-header">
        <h3 className="group-title">Daily Energy Target</h3>
        <p className="energy-value">
          {Math.round(calories)} <span>Kcal</span>
        </p>
      </div>

      <div className="energy-slider-wrap">
        <input
          className="energy-slider"
          type="range"
          min={minCalories}
          max={maxCalories}
          value={Math.max(minCalories, Math.min(maxCalories, calories))}
          onChange={(event) => onChange("calories", Number(event.target.value))}
        />
        <div className="energy-scale">
          <span>{minCalories} KCAL</span>
          <span>{maxCalories} KCAL</span>
        </div>
      </div>

      <div className="compact-form-grid">
        <label className="field">
          <span>Weight (kg)</span>
          <NumberStepper
            value={safeWeight}
            min={30}
            step={1}
            onChange={(next) => onChange("weightKg", next)}
            inputAriaLabel="Weight"
            increaseAriaLabel="Weight arttir"
            decreaseAriaLabel="Weight azalt"
          />
        </label>

        <label className="field">
          <span>Height (cm)</span>
          <NumberStepper
            value={safeHeight}
            min={120}
            step={1}
            onChange={(next) => onChange("heightCm", next)}
            inputAriaLabel="Height"
            increaseAriaLabel="Height arttir"
            decreaseAriaLabel="Height azalt"
          />
        </label>

        <label className="field field-full">
          <span>Meal Count</span>
          <NumberStepper
            value={safeMealCount}
            min={3}
            max={6}
            step={1}
            onChange={(next) => onMealCountChange(next)}
            inputAriaLabel="Meal count"
            increaseAriaLabel="Meal count arttir"
            decreaseAriaLabel="Meal count azalt"
          />
        </label>
      </div>
    </section>
  );
}
