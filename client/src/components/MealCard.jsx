function MacroLine({ label, value }) {
  return (
    <div className="meal-macro-pill">
      <span className="meal-macro-label">{label}:</span>
      <span>{value}</span>
    </div>
  );
}

export default function MealCard({ meal, onSwap }) {
  const protein = meal.items.find((item) => item.type === "protein");
  const carb = meal.items.find((item) => item.type === "carb");
  const fat = meal.items.find((item) => item.type === "fat");

  return (
    <article className="meal-card">
      <header className="meal-card-head">
        <h3 className="meal-title">{meal.title}</h3>
        <span className="meal-score-chip">
          Score {meal.score}
        </span>
      </header>

      <p className="meal-combo-name">
        {protein?.name} + {carb?.name} + {fat?.name}
      </p>

      <div className="meal-macro-grid">
        <MacroLine label="Protein" value={`${meal.macros.protein} g`} />
        <MacroLine label="Carb" value={`${meal.macros.carb} g`} />
        <MacroLine label="Yag" value={`${meal.macros.fat} g`} />
        <MacroLine label="Kalori" value={`${meal.macros.calories} kcal`} />
      </div>

      <div className="meal-items-grid">
        {meal.items.map((item) => (
          <div key={item.id} className="meal-item-row">
            <span>{item.name}</span>
            <span>{item.grams} g</span>
          </div>
        ))}
      </div>

      <div className="meal-actions">
        <button className="swap-btn swap-btn-protein" onClick={() => onSwap(meal.id, "protein")}>
          Proteini Degistir
        </button>
        <button className="swap-btn swap-btn-carb" onClick={() => onSwap(meal.id, "carb")}>
          Karbi Degistir
        </button>
        <button className="swap-btn swap-btn-fat" onClick={() => onSwap(meal.id, "fat")}>
          Yagi Degistir
        </button>
      </div>
    </article>
  );
}
