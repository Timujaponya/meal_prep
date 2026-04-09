import { useMemo, useState } from "react";
import MacroSummary from "../components/MacroSummary.jsx";
import { dashboardMealFallback } from "../data/recipes.js";

const INITIAL_TRACKING_FORM = {
  title: "",
  quantity: 1,
  calories: 450,
  protein: 35,
  carb: 40,
  fat: 15
};

function roundOne(value) {
  return Math.round((Number(value) || 0) * 10) / 10;
}

function DashboardMealCard({ meal, onAddToCart }) {
  return (
    <article className="dashboard-meal-card">
      <div className="dashboard-meal-image" style={{ backgroundImage: `url(${meal.image})` }}>
        <div className="dashboard-meal-overlay" />
      </div>

      <div className="dashboard-meal-body">
        <h3>{meal.title}</h3>
        <p>{meal.calories} kcal</p>

        <div className="dashboard-meal-macros">
          <span>P {meal.protein}g</span>
          <span>C {meal.carb}g</span>
          <span>F {meal.fat}g</span>
        </div>

        <button type="button" className="swap-btn swap-btn-protein" onClick={() => onAddToCart(meal)}>
          Add To Plan
        </button>
      </div>
    </article>
  );
}

function weekdayShort(date) {
  return date.toLocaleDateString("en-US", { weekday: "short" });
}

function buildDatePills(selectedDate) {
  const base = new Date(`${selectedDate}T12:00:00`);
  if (Number.isNaN(base.getTime())) {
    return [];
  }

  const pills = [];
  for (let offset = -3; offset <= 3; offset += 1) {
    const next = new Date(base);
    next.setDate(base.getDate() + offset);
    pills.push({
      iso: next.toISOString().slice(0, 10),
      day: weekdayShort(next),
      date: String(next.getDate()).padStart(2, "0")
    });
  }

  return pills;
}

export default function DashboardPage({
  plan,
  onAddToCart,
  selectedDate,
  onDateChange,
  onMoveDate,
  dayLog,
  dayLogBusy,
  onAddDayLogEntry,
  onUpdateDayLogEntry,
  onDeleteDayLogEntry,
  onAddWater,
  waterBusy
}) {
  const [showAllMeals, setShowAllMeals] = useState(false);
  const [addingTracking, setAddingTracking] = useState(false);
  const [trackingForm, setTrackingForm] = useState(INITIAL_TRACKING_FORM);
  const [editingTrackingId, setEditingTrackingId] = useState(null);
  const [editingTrackingForm, setEditingTrackingForm] = useState(INITIAL_TRACKING_FORM);

  const planMeals =
    plan?.meals?.map((meal) => ({
      id: meal.id,
      title: meal.title,
      calories: meal.macros.calories,
      protein: Math.round(meal.macros.protein),
      carb: Math.round(meal.macros.carb),
      fat: Math.round(meal.macros.fat),
      image:
        "https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=1200&q=80"
    })) ?? [];

  const meals = useMemo(() => (planMeals.length ? planMeals : dashboardMealFallback), [planMeals]);

  const visibleMeals = showAllMeals ? meals : meals.slice(0, 2);
  const datePills = buildDatePills(selectedDate);

  function resetTrackingForm() {
    setTrackingForm(INITIAL_TRACKING_FORM);
    setAddingTracking(false);
  }

  async function handleAddTrackingSubmit(event) {
    event.preventDefault();
    await onAddDayLogEntry(trackingForm);
    resetTrackingForm();
  }

  function beginTrackingEdit(entry) {
    const baseQuantity = Math.max(1, Number(entry.quantity) || 1);
    setEditingTrackingId(entry.sourceId);
    setEditingTrackingForm({
      title: String(entry.title || ""),
      quantity: baseQuantity,
      calories: roundOne(Number(entry.calories) / baseQuantity),
      protein: roundOne(Number(entry.protein) / baseQuantity),
      carb: roundOne(Number(entry.carb) / baseQuantity),
      fat: roundOne(Number(entry.fat) / baseQuantity)
    });
  }

  function cancelTrackingEdit() {
    setEditingTrackingId(null);
    setEditingTrackingForm(INITIAL_TRACKING_FORM);
  }

  async function saveTrackingEdit(sourceId) {
    await onUpdateDayLogEntry(sourceId, editingTrackingForm);
    cancelTrackingEdit();
  }

  return (
    <section className="page-screen">
      <header className="screen-top panel-glass">
        <div className="screen-top-main">
          <div>
            <p className="kicker">Dashboard</p>
            <h1 className="screen-title">Good Morning</h1>
            <p className="screen-subtitle">Daily macro status and meal highlights.</p>
          </div>

          <div className="screen-actions" aria-hidden="true">
            <span className="action-dot action-dot-soft" />
            <span className="action-dot action-dot-strong" />
          </div>
        </div>

        <div className="status-chip-row">
          <span className="status-chip status-chip-green">Macro Sync</span>
          <span className="status-chip">2 Meals Ready</span>
          <span className="status-chip">Cart Active</span>
        </div>
      </header>

      <section className="panel panel-glass day-tracker-panel">
        <div className="section-head">
          <h2 className="section-title">Daily Tracking</h2>
          <div className="tracker-nav-actions">
            <button type="button" className="swap-btn swap-btn-protein" onClick={() => setAddingTracking((prev) => !prev)}>
              {addingTracking ? "Close Add" : "Add"}
            </button>
            <button type="button" className="swap-btn" onClick={() => onMoveDate(-1)}>
              Prev
            </button>
            <button type="button" className="swap-btn" onClick={() => onMoveDate(1)}>
              Next
            </button>
          </div>
        </div>

        {addingTracking ? (
          <form className="tracking-add-form" onSubmit={handleAddTrackingSubmit}>
            <label className="field field-full">
              <span>Baslik</span>
              <input
                required
                value={trackingForm.title}
                onChange={(event) => setTrackingForm((current) => ({ ...current, title: event.target.value }))}
              />
            </label>

            <label className="field">
              <span>Qty</span>
              <input
                type="number"
                min="1"
                value={trackingForm.quantity}
                onChange={(event) =>
                  setTrackingForm((current) => ({
                    ...current,
                    quantity: Math.max(1, Number(event.target.value) || 1)
                  }))
                }
              />
            </label>

            <label className="field">
              <span>Kalori</span>
              <input
                type="number"
                min="0"
                value={trackingForm.calories}
                onChange={(event) =>
                  setTrackingForm((current) => ({
                    ...current,
                    calories: Math.max(0, Number(event.target.value) || 0)
                  }))
                }
              />
            </label>

            <label className="field">
              <span>Protein</span>
              <input
                type="number"
                min="0"
                value={trackingForm.protein}
                onChange={(event) =>
                  setTrackingForm((current) => ({
                    ...current,
                    protein: Math.max(0, Number(event.target.value) || 0)
                  }))
                }
              />
            </label>

            <label className="field">
              <span>Carb</span>
              <input
                type="number"
                min="0"
                value={trackingForm.carb}
                onChange={(event) =>
                  setTrackingForm((current) => ({
                    ...current,
                    carb: Math.max(0, Number(event.target.value) || 0)
                  }))
                }
              />
            </label>

            <label className="field">
              <span>Fat</span>
              <input
                type="number"
                min="0"
                value={trackingForm.fat}
                onChange={(event) =>
                  setTrackingForm((current) => ({
                    ...current,
                    fat: Math.max(0, Number(event.target.value) || 0)
                  }))
                }
              />
            </label>

            <div className="tracking-add-actions field-full">
              <button type="button" className="swap-btn" onClick={resetTrackingForm} disabled={dayLogBusy}>
                Iptal
              </button>
              <button type="submit" className="swap-btn swap-btn-protein" disabled={dayLogBusy}>
                Ekle
              </button>
            </div>
          </form>
        ) : null}

        <div className="day-row">
          {datePills.map((item) => (
            <button
              key={item.iso}
              type="button"
              className={`day-pill ${item.iso === selectedDate ? "day-pill-active" : ""}`}
              onClick={() => onDateChange(item.iso)}
            >
              <span>{item.day}</span>
              <strong>{item.date}</strong>
            </button>
          ))}
        </div>

        <div className="history-totals-grid">
          <article>
            <span>Calories</span>
            <strong>{dayLog?.meals?.totals?.calories || 0}</strong>
          </article>
          <article>
            <span>Protein</span>
            <strong>{dayLog?.meals?.totals?.protein || 0}g</strong>
          </article>
          <article>
            <span>Carb</span>
            <strong>{dayLog?.meals?.totals?.carb || 0}g</strong>
          </article>
          <article>
            <span>Fat</span>
            <strong>{dayLog?.meals?.totals?.fat || 0}g</strong>
          </article>
        </div>

        {!dayLog?.meals?.entries?.length ? (
          <p className="panel-copy">Bu tarih icin kayitli checkout bulunmuyor.</p>
        ) : (
          <div className="history-list">
            {dayLog.meals.entries.map((entry) => (
              <article key={`${entry.sourceId}_${entry.title}`} className="history-item tracking-entry-row">
                <div className="tracking-entry-main">
                  <h4>{entry.title}</h4>
                  <p>
                    Qty {entry.quantity} · {entry.calories} kcal · P {entry.protein}g · C {entry.carb}g · F {entry.fat}g
                  </p>
                </div>

                <div className="tracking-entry-actions">
                  {editingTrackingId === entry.sourceId ? (
                    <>
                      <div className="tracking-inline-edit-grid">
                        <input
                          type="text"
                          placeholder="Baslik"
                          value={editingTrackingForm.title}
                          onChange={(event) =>
                            setEditingTrackingForm((current) => ({
                              ...current,
                              title: event.target.value
                            }))
                          }
                          disabled={dayLogBusy}
                        />
                        <input
                          type="number"
                          min="1"
                          placeholder="Qty"
                          value={editingTrackingForm.quantity}
                          onChange={(event) =>
                            setEditingTrackingForm((current) => ({
                              ...current,
                              quantity: Math.max(1, Number(event.target.value) || 1)
                            }))
                          }
                          disabled={dayLogBusy}
                        />
                        <input
                          type="number"
                          min="0"
                          step="0.1"
                          placeholder="Kalori/Birim"
                          value={editingTrackingForm.calories}
                          onChange={(event) =>
                            setEditingTrackingForm((current) => ({
                              ...current,
                              calories: Math.max(0, Number(event.target.value) || 0)
                            }))
                          }
                          disabled={dayLogBusy}
                        />
                        <input
                          type="number"
                          min="0"
                          step="0.1"
                          placeholder="Protein/Birim"
                          value={editingTrackingForm.protein}
                          onChange={(event) =>
                            setEditingTrackingForm((current) => ({
                              ...current,
                              protein: Math.max(0, Number(event.target.value) || 0)
                            }))
                          }
                          disabled={dayLogBusy}
                        />
                        <input
                          type="number"
                          min="0"
                          step="0.1"
                          placeholder="Carb/Birim"
                          value={editingTrackingForm.carb}
                          onChange={(event) =>
                            setEditingTrackingForm((current) => ({
                              ...current,
                              carb: Math.max(0, Number(event.target.value) || 0)
                            }))
                          }
                          disabled={dayLogBusy}
                        />
                        <input
                          type="number"
                          min="0"
                          step="0.1"
                          placeholder="Fat/Birim"
                          value={editingTrackingForm.fat}
                          onChange={(event) =>
                            setEditingTrackingForm((current) => ({
                              ...current,
                              fat: Math.max(0, Number(event.target.value) || 0)
                            }))
                          }
                          disabled={dayLogBusy}
                        />
                      </div>
                      <button
                        type="button"
                        className="swap-btn"
                        disabled={dayLogBusy}
                        onClick={() => saveTrackingEdit(entry.sourceId)}
                      >
                        Kaydet
                      </button>
                      <button type="button" className="swap-btn" disabled={dayLogBusy} onClick={cancelTrackingEdit}>
                        Iptal
                      </button>
                    </>
                  ) : (
                    <button type="button" className="swap-btn" disabled={dayLogBusy} onClick={() => beginTrackingEdit(entry)}>
                      Duzenle
                    </button>
                  )}

                  <button
                    type="button"
                    className="remove-food-btn"
                    disabled={dayLogBusy}
                    onClick={() => onDeleteDayLogEntry(entry.sourceId)}
                  >
                    Sil
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="panel panel-glass water-panel">
        <div className="section-head">
          <h2 className="section-title">Water Tracking</h2>
          <span className="section-meta">
            {dayLog?.water?.totalMl || 0} / {dayLog?.water?.targetMl || 2800} ml
          </span>
        </div>

        <div className="water-progress-track">
          <i style={{ width: `${Math.round((dayLog?.water?.progress || 0) * 100)}%` }} />
        </div>

        <div className="water-actions">
          <button type="button" className="swap-btn swap-btn-carb" disabled={waterBusy} onClick={() => onAddWater(250)}>
            +250 ml
          </button>
          <button type="button" className="swap-btn swap-btn-carb" disabled={waterBusy} onClick={() => onAddWater(500)}>
            +500 ml
          </button>
        </div>
      </section>

      <MacroSummary totals={plan?.totals} target={plan?.dailyTarget} />

      <section className="panel panel-glass">
        <div className="section-head">
          <h2 className="section-title">Today Meal Plan</h2>
          <button type="button" className="text-link-btn" onClick={() => setShowAllMeals((prev) => !prev)}>
            {showAllMeals ? "Kucult" : "See All"}
          </button>
        </div>

        <div className="dashboard-meal-grid">
          {visibleMeals.map((meal) => (
            <DashboardMealCard key={meal.id} meal={meal} onAddToCart={onAddToCart} />
          ))}
        </div>
      </section>
    </section>
  );
}
