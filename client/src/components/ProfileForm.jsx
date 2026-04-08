export default function ProfileForm({ profile, onChange, mealCount, onMealCountChange }) {
  return (
    <section className="panel panel-glass">
      <h2 className="panel-title">Kullanici Profili</h2>
      <div className="form-grid">
        <label className="field">
          <span>Kilo (kg)</span>
          <input
            type="number"
            min="30"
            value={profile.weightKg}
            onChange={(event) => onChange("weightKg", Number(event.target.value))}
          />
        </label>

        <label className="field">
          <span>Boy (cm)</span>
          <input
            type="number"
            min="120"
            value={profile.heightCm}
            onChange={(event) => onChange("heightCm", Number(event.target.value))}
          />
        </label>

        <label className="field field-full">
          <span>Hedef</span>
          <select value={profile.goal} onChange={(event) => onChange("goal", event.target.value)}>
            <option value="cut">Cut</option>
            <option value="maintain">Maintain</option>
            <option value="bulk">Bulk</option>
          </select>
        </label>

        <label className="field field-full">
          <span>Kalori Modu</span>
          <select value={profile.calorieMode} onChange={(event) => onChange("calorieMode", event.target.value)}>
            <option value="auto">Otomatik Hesapla</option>
            <option value="manual">Manuel Gir</option>
          </select>
        </label>

        {profile.calorieMode === "manual" ? (
          <label className="field field-full">
            <span>Gunluk Kalori</span>
            <input
              type="number"
              min="1200"
              value={profile.calories}
              onChange={(event) => onChange("calories", Number(event.target.value))}
            />
          </label>
        ) : null}

        <label className="field field-full">
          <span>Ogun Sayisi</span>
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
