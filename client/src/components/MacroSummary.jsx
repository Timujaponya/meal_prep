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
        <h2 className="section-title">Dashboard</h2>
        <p className="panel-copy">Plan olusturdugunda makro dagilimi ve kalan kalori burada gorunur.</p>
      </section>
    );
  }

  const calorieRatio = Math.max(0, Math.min(1, totals.calories / Math.max(1, target.calories)));
  const remaining = Math.max(0, Math.round(target.calories - totals.calories));

  return (
    <section className="panel panel-glass macro-dashboard">
      <div className="section-head">
        <h2 className="section-title">Good Morning, Athlete</h2>
        <span className="section-meta">Today Overview</span>
      </div>

      <div className="macro-dashboard-grid">
        <div className="macro-ring-wrap">
          <div className="macro-ring" style={{ "--progress": `${Math.round(calorieRatio * 360)}deg` }}>
            <div className="macro-ring-inner">
              <strong>{Math.round(totals.calories)}</strong>
              <small>kcal</small>
            </div>
          </div>
        </div>

        <div className="macro-grid">
          <MacroBar label="Protein" current={totals.protein} target={target.protein} toneClass="tone-green" />
          <MacroBar label="Carbs" current={totals.carb} target={target.carb} toneClass="tone-blue" />
          <MacroBar label="Fat" current={totals.fat} target={target.fat} toneClass="tone-orange" />

          <div className="remaining-card">
            <span>Remaining</span>
            <strong>{remaining} kcal</strong>
          </div>
        </div>
      </div>
    </section>
  );
}
