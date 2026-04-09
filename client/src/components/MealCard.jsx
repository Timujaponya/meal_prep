const IMAGE_BANK = [
  "https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1547496502-affa22d38842?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1482049016688-2d3e1b311543?auto=format&fit=crop&w=1200&q=80"
];

export default function MealCard({ meal, onSwap, index = 0, onAddToCart }) {
  const protein = meal.items.find((item) => item.type === "protein");
  const carb = meal.items.find((item) => item.type === "carb");
  const fat = meal.items.find((item) => item.type === "fat");
  const imageUrl = IMAGE_BANK[index % IMAGE_BANK.length];

  return (
    <article className="meal-card">
      <div className="meal-hero" style={{ backgroundImage: `url(${imageUrl})` }}>
        <div className="meal-hero-overlay" />
        <span className="meal-tag">{meal.title}</span>
        <span className="meal-score-chip">Score {meal.score}</span>
      </div>

      <div className="meal-body">
        <h3 className="meal-title">{protein?.name} + {carb?.name}</h3>
        <p className="meal-combo-name">{fat?.name} ile dengeli makro dagilimi</p>

        <div className="meal-kcal-line">
          <strong>{meal.macros.calories} kcal</strong>
          <span>
            P {Math.round(meal.macros.protein)}g | C {Math.round(meal.macros.carb)}g | F {Math.round(meal.macros.fat)}g
          </span>
        </div>

        <div className="meal-items-grid">
        {meal.items.map((item) => (
          <div key={item.id} className="meal-item-row">
            <span>{item.name}</span>
            <span>{item.grams} g</span>
          </div>
        ))}
        </div>
      </div>

      <div className="meal-actions">
        <button className="swap-btn swap-btn-protein" onClick={() => onSwap(meal.id, "protein")}>
          Protein
        </button>
        <button className="swap-btn swap-btn-carb" onClick={() => onSwap(meal.id, "carb")}>
          Carb
        </button>
        <button className="swap-btn swap-btn-fat" onClick={() => onSwap(meal.id, "fat")}>
          Fat
        </button>
        {onAddToCart ? (
          <button className="swap-btn" onClick={() => onAddToCart(meal)}>
            Add To Cart
          </button>
        ) : null}
      </div>
    </article>
  );
}
