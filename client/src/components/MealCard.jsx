function MacroLine({ label, value }) {
  return (
    <div className="rounded-lg bg-white/70 px-3 py-2 text-sm">
      <span className="mr-2 font-semibold">{label}:</span>
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
      <header className="flex items-center justify-between">
        <h3 className="font-display text-2xl">{meal.title}</h3>
        <span className="rounded-full bg-ink/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em]">
          Score {meal.score}
        </span>
      </header>

      <p className="mt-3 text-lg font-medium text-ink">
        {protein?.name} + {carb?.name} + {fat?.name}
      </p>

      <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
        <MacroLine label="Protein" value={`${meal.macros.protein} g`} />
        <MacroLine label="Carb" value={`${meal.macros.carb} g`} />
        <MacroLine label="Yag" value={`${meal.macros.fat} g`} />
        <MacroLine label="Kalori" value={`${meal.macros.calories} kcal`} />
      </div>

      <div className="mt-4 grid gap-2 text-sm text-ink/75">
        {meal.items.map((item) => (
          <div key={item.id} className="flex items-center justify-between rounded-lg bg-white/80 px-3 py-2">
            <span>{item.name}</span>
            <span>{item.grams} g</span>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button className="swap-btn" onClick={() => onSwap(meal.id, "protein")}>
          Proteini Degistir
        </button>
        <button className="swap-btn" onClick={() => onSwap(meal.id, "carb")}>
          Karbi Degistir
        </button>
        <button className="swap-btn" onClick={() => onSwap(meal.id, "fat")}>
          Yagi Degistir
        </button>
      </div>
    </article>
  );
}
