export default function ProfileForm({ profile, onChange, mealCount, onMealCountChange }) {
  const goals = [
    { value: "cut", label: "Fat Loss" },
    { value: "bulk", label: "Muscle Gain" },
    { value: "maintain", label: "Maintenance" }
  ];

  const macroPresets = [
    { id: "high", label: "High Protein", ratio: "40/30/30", targetGoal: "cut" },
    { id: "balanced", label: "Balanced", ratio: "33/33/33", targetGoal: "maintain" },
    { id: "keto", label: "Keto", ratio: "5/25/70", targetGoal: "bulk" }
  ];

  const calories = Number(profile.calories || 2150);
  const minCalories = 1800;
  const maxCalories = 4200;

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

      <h3 className="group-title macro-title">Macro Profile</h3>
      <div className="macro-profile-grid">
        {macroPresets.map((preset) => (
          <button
            key={preset.id}
            type="button"
            className={`macro-profile-card ${profile.goal === preset.targetGoal ? "macro-profile-card-active" : ""}`}
            onClick={() => onChange("goal", preset.targetGoal)}
          >
            <span>{preset.label}</span>
            <i />
            <small>{preset.ratio}</small>
          </button>
        ))}
      </div>

      <div className="compact-form-grid">
        <label className="field">
          <span>Weight (kg)</span>
          <input
            type="number"
            min="30"
            value={profile.weightKg}
            onChange={(event) => onChange("weightKg", Number(event.target.value))}
          />
        </label>

        <label className="field">
          <span>Height (cm)</span>
          <input
            type="number"
            min="120"
            value={profile.heightCm}
            onChange={(event) => onChange("heightCm", Number(event.target.value))}
          />
        </label>

        <label className="field field-full">
          <span>Meal Count</span>
          <input
            type="number"
            min="3"
            max="6"
            value={mealCount}
            onChange={(event) => onMealCountChange(Number(event.target.value || 4))}
          />
        </label>
      </div>
    </section>
  );
}
