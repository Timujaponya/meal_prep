import { useMemo, useState } from "react";

const INITIAL_FORM = {
  name: "",
  type: "protein",
  protein: 20,
  carb: 0,
  fat: 5,
  defaultPortion: 100
};

const TYPE_ORDER = { protein: 1, carb: 2, fat: 3 };

export default function IngredientSelector({
  foods,
  selectableFoodIds = [],
  selectedIds,
  onToggle,
  onAddFood,
  onUpdateFood,
  onRemoveFood,
  busy
}) {
  const [form, setForm] = useState(INITIAL_FORM);
  const [expanded, setExpanded] = useState(false);
  const [editingFoodId, setEditingFoodId] = useState(null);

  const calculatedCalories = useMemo(
    () => Math.round(Number(form.protein) * 4 + Number(form.carb) * 4 + Number(form.fat) * 9),
    [form]
  );

  const sortedFoods = useMemo(
    () =>
      [...foods].sort((a, b) => {
        const typeDiff = (TYPE_ORDER[a.type] || 999) - (TYPE_ORDER[b.type] || 999);
        if (typeDiff !== 0) return typeDiff;
        return a.name.localeCompare(b.name, "tr");
      }),
    [foods]
  );

  const selectableSet = useMemo(() => new Set(selectableFoodIds), [selectableFoodIds]);
  const pantryFoods = useMemo(() => sortedFoods.filter((food) => selectableSet.has(food.id)), [sortedFoods, selectableSet]);

  function updateForm(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function beginEdit(food) {
    setEditingFoodId(food.id);
    setForm({
      name: food.name,
      type: food.type,
      protein: Number(food.protein) || 0,
      carb: Number(food.carb) || 0,
      fat: Number(food.fat) || 0,
      defaultPortion: Number(food.defaultPortion) || 100
    });
    setExpanded(true);
  }

  function resetForm() {
    setEditingFoodId(null);
    setForm(INITIAL_FORM);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const payload = {
      ...form,
      calories: calculatedCalories
    };

    if (editingFoodId) {
      await onUpdateFood(editingFoodId, payload);
      resetForm();
      return;
    }

    await onAddFood(payload);
    resetForm();
  }

  return (
    <section className="panel panel-glass">
      <div className="ingredient-toolbar">
        <h2 className="section-title">Ingredient Pantry</h2>
        <button type="button" className="add-more-btn" onClick={() => setExpanded((prev) => !prev)}>
          + Add More
        </button>
      </div>

      <div className="pantry-chip-wrap">
        {pantryFoods.map((food) => {
          const checked = selectedIds.includes(food.id);
          return (
            <article key={food.id} className={`pantry-chip-item ${checked ? "pantry-chip-item-active" : ""}`}>
              <button
                type="button"
                className={`pantry-chip-toggle ${checked ? "pantry-chip-toggle-active" : ""}`}
                onClick={() => onToggle(food.id)}
              >
                <span className="pantry-check-mark" aria-hidden="true">
                  {checked ? "✓" : "+"}
                </span>
                <span>{food.name}</span>
                <small>{food.type}</small>
              </button>

              <div className="pantry-chip-actions">
                <button type="button" className="swap-btn" disabled={busy} onClick={() => beginEdit(food)}>
                  Duzenle
                </button>
                <button type="button" className="remove-food-btn" disabled={busy} onClick={() => onRemoveFood(food.id)}>
                  x
                </button>
              </div>
            </article>
          );
        })}
      </div>

      {!pantryFoods.length ? <p className="panel-copy">Pantry secimi icin once My Items'tan malzeme eklemelisin.</p> : null}

      {expanded ? (
        <div className="manager-block">
          <p className="panel-copy">Yeni malzeme ekleyebilir veya secili malzemeyi duzenleyebilirsin.</p>

          <form className="add-food-form" onSubmit={handleSubmit}>
            <h3 className="group-title">{editingFoodId ? "Malzeme Duzenle" : "Yeni Malzeme Ekle"}</h3>

            <div className="form-grid">
              <label className="field field-full">
                <span>Ad</span>
                <input required value={form.name} onChange={(event) => updateForm("name", event.target.value)} />
              </label>

              <label className="field field-full">
                <span>Tip</span>
                <select value={form.type} onChange={(event) => updateForm("type", event.target.value)}>
                  <option value="protein">Protein</option>
                  <option value="carb">Karbonhidrat</option>
                  <option value="fat">Yag</option>
                </select>
              </label>

              <label className="field">
                <span>Protein (100g)</span>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={form.protein}
                  onChange={(event) => updateForm("protein", Number(event.target.value))}
                />
              </label>

              <label className="field">
                <span>Carb (100g)</span>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={form.carb}
                  onChange={(event) => updateForm("carb", Number(event.target.value))}
                />
              </label>

              <label className="field">
                <span>Yag (100g)</span>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={form.fat}
                  onChange={(event) => updateForm("fat", Number(event.target.value))}
                />
              </label>

              <label className="field">
                <span>Porsiyon (g)</span>
                <input
                  type="number"
                  min="1"
                  value={form.defaultPortion}
                  onChange={(event) => updateForm("defaultPortion", Number(event.target.value))}
                />
              </label>
            </div>

            <div className="form-footer-row">
              <span>Kalori (100g): {calculatedCalories} kcal</span>
              <div className="inline-actions">
                {editingFoodId ? (
                  <button type="button" className="swap-btn" onClick={resetForm} disabled={busy}>
                    Iptal
                  </button>
                ) : null}
                <button className="swap-btn" type="submit" disabled={busy}>
                  {editingFoodId ? "Guncelle" : "Ekle"}
                </button>
              </div>
            </div>
          </form>
        </div>
      ) : null}
    </section>
  );
}
