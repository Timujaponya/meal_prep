function MacroBar({ label, current, target, unit = "g" }) {
  const ratio = Math.min(100, Math.round((current / Math.max(1, target)) * 100));

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold">{label}</span>
        <span>
          {Math.round(current)} / {Math.round(target)} {unit}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-fog">
        <div className="h-full rounded-full bg-ember transition-all duration-500" style={{ width: `${ratio}%` }} />
      </div>
    </div>
  );
}

export default function MacroSummary({ totals, target }) {
  if (!totals || !target) {
    return (
      <section className="panel">
        <h2 className="panel-title">Gunluk Makro Takibi</h2>
        <p className="text-sm text-ink/65">Plan olusturdugunda hedef ve gerceklesen degerler burada gorunur.</p>
      </section>
    );
  }

  return (
    <section className="panel">
      <h2 className="panel-title">Gunluk Makro Takibi</h2>
      <div className="space-y-4">
        <MacroBar label="Protein" current={totals.protein} target={target.protein} />
        <MacroBar label="Karbonhidrat" current={totals.carb} target={target.carb} />
        <MacroBar label="Yag" current={totals.fat} target={target.fat} />
        <MacroBar label="Kalori" current={totals.calories} target={target.calories} unit="kcal" />
      </div>
    </section>
  );
}
