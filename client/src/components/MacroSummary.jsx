function MacroBar({ label, current, target, unit = "g", toneClass }) {
  const ratio = Math.min(100, Math.round((current / Math.max(1, target)) * 100));

  return (
    <div className="macro-row">
      <div className="macro-header">
        <span className="macro-label">{label}</span>
        <span>
          {Math.round(current)} / {Math.round(target)} {unit}
        </span>
      </div>
      <div className="macro-track">
        <div className={`macro-fill ${toneClass}`} style={{ width: `${ratio}%` }} />
      </div>
    </div>
  );
}

export default function MacroSummary({ totals, target }) {
  if (!totals || !target) {
    return (
      <section className="panel panel-glass">
        <h2 className="panel-title">Gunluk Makro Takibi</h2>
        <p className="panel-copy">Plan olusturdugunda hedef ve gerceklesen degerler burada gorunur.</p>
      </section>
    );
  }

  return (
    <section className="panel panel-glass">
      <h2 className="panel-title">Gunluk Makro Takibi</h2>
      <div className="macro-grid">
        <MacroBar label="Protein" current={totals.protein} target={target.protein} toneClass="tone-green" />
        <MacroBar label="Karbonhidrat" current={totals.carb} target={target.carb} toneClass="tone-blue" />
        <MacroBar label="Yag" current={totals.fat} target={target.fat} toneClass="tone-orange" />
        <MacroBar label="Kalori" current={totals.calories} target={target.calories} unit="kcal" toneClass="tone-purple" />
      </div>
    </section>
  );
}
