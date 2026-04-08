import { useMemo, useState } from "react";

const INITIAL_FORM = {
  name: "",
  type: "protein",
  protein: 20,
  carb: 0,
  fat: 5,
  defaultPortion: 100
};

function Group({ title, items, selectedIds, onToggle, onRemove, busy }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-ink/70">{title}</h3>
        <span className="text-xs text-ink/60">{items.length} adet</span>
      </div>

      <div className="grid gap-2">
        {items.map((item) => {
          const checked = selectedIds.includes(item.id);
          return (
            <div key={item.id} className={`food-row ${checked ? "food-row-active" : ""}`}>
              <label className="flex min-w-0 items-center gap-2">
                <input type="checkbox" checked={checked} onChange={() => onToggle(item.id)} />
                <span className="truncate">{item.name}</span>
              </label>

              <div className="flex items-center gap-2 text-xs text-ink/65">
                <span>P {Math.round(item.protein)}</span>
                <span>C {Math.round(item.carb)}</span>
                <span>F {Math.round(item.fat)}</span>
                <button type="button" className="remove-food-btn" disabled={busy} onClick={() => onRemove(item.id)}>
                  Sil
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function IngredientSelector({ foods, selectedIds, onToggle, onAddFood, onRemoveFood, busy }) {
  const [form, setForm] = useState(INITIAL_FORM);

  const proteins = foods.filter((food) => food.type === "protein");
  const carbs = foods.filter((food) => food.type === "carb");
  const fats = foods.filter((food) => food.type === "fat");

  const calculatedCalories = useMemo(
    () => Math.round(Number(form.protein) * 4 + Number(form.carb) * 4 + Number(form.fat) * 9),
    [form]
  );

  function updateForm(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    await onAddFood({
      ...form,
      calories: calculatedCalories
    });
    setForm((current) => ({ ...INITIAL_FORM, type: current.type }));
  }

  return (
    <section className="panel">
      <div className="ingredient-toolbar">
        <h2 className="panel-title">Malzeme Secimi</h2>
        <p className="text-xs text-ink/65">Toplam: {foods.length}</p>
      </div>

      <p className="text-sm text-ink/70">Her kategoriden en az bir secim yapman gerekiyor. Satirdaki Sil ile listeden cikarabilirsin.</p>

      <div className="mt-4 space-y-5">
        <Group title="Protein" items={proteins} selectedIds={selectedIds} onToggle={onToggle} onRemove={onRemoveFood} busy={busy} />
        <Group title="Karbonhidrat" items={carbs} selectedIds={selectedIds} onToggle={onToggle} onRemove={onRemoveFood} busy={busy} />
        <Group title="Yag" items={fats} selectedIds={selectedIds} onToggle={onToggle} onRemove={onRemoveFood} busy={busy} />
      </div>

      <form className="add-food-form" onSubmit={handleSubmit}>
        <h3 className="text-sm font-semibold uppercase tracking-[0.1em] text-ink/80">Yeni Malzeme Ekle</h3>

        <div className="grid grid-cols-2 gap-2">
          <label className="field col-span-2">
            <span>Ad</span>
            <input required value={form.name} onChange={(event) => updateForm("name", event.target.value)} />
          </label>

          <label className="field col-span-2">
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

        <div className="mt-2 flex items-center justify-between text-sm text-ink/70">
          <span>Kalori (100g): {calculatedCalories} kcal</span>
          <button className="swap-btn" type="submit" disabled={busy}>
            Ekle
          </button>
        </div>
      </form>
    </section>
  );
}
