import { useMemo, useState } from "react";
import NumberStepper from "../components/NumberStepper.jsx";

export default function InventoryPage({ items = [], catalog = [], onSaveAmount, onIncrementAmount, onResolvePortion, busy }) {
  const [localAmounts, setLocalAmounts] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFoodId, setSelectedFoodId] = useState("");
  const [newAmount, setNewAmount] = useState(100);
  const [portionExpression, setPortionExpression] = useState("");
  const [portionMessage, setPortionMessage] = useState("");
  const [portionBusy, setPortionBusy] = useState(false);

  const activeItems = useMemo(() => items.filter((item) => Number(item.amountGrams) > 0), [items]);

  const grouped = useMemo(() => {
    return {
      protein: activeItems.filter((item) => item.type === "protein"),
      carb: activeItems.filter((item) => item.type === "carb"),
      fat: activeItems.filter((item) => item.type === "fat")
    };
  }, [activeItems]);

  const filteredCatalog = useMemo(() => {
    const query = searchTerm.trim().toLocaleLowerCase("tr");
    if (!query) {
      return catalog.slice(0, 120);
    }

    return catalog
      .filter((item) => item.name.toLocaleLowerCase("tr").includes(query))
      .slice(0, 120);
  }, [catalog, searchTerm]);

  async function addItem() {
    const amount = Math.max(0.1, Math.round((Number(newAmount) || 0) * 10) / 10);
    if (!selectedFoodId) {
      return;
    }

    if (typeof onIncrementAmount === "function") {
      await onIncrementAmount(selectedFoodId, amount);
    } else {
      const existingAmount = Number(items.find((item) => item.id === selectedFoodId)?.amountGrams) || 0;
      const nextAmount = existingAmount + amount;
      await onSaveAmount(selectedFoodId, nextAmount);
    }

    setSelectedFoodId("");
    setSearchTerm("");
    setPortionExpression("");
    setPortionMessage("");
  }

  async function resolvePortionExpression() {
    const text = portionExpression.trim();
    if (!text) {
      setPortionMessage("Porsiyon metni bos olamaz.");
      return;
    }

    if (typeof onResolvePortion !== "function") {
      setPortionMessage("Portion resolver su an aktif degil.");
      return;
    }

    setPortionBusy(true);
    setPortionMessage("");
    try {
      const resolved = await onResolvePortion(text);
      const foodId = String(resolved?.food?.id || "").trim();
      const foodName = String(resolved?.food?.name || "").trim();
      const grams = Math.max(0.1, Number(resolved?.grams) || 0);

      if (!foodId || !grams) {
        throw new Error("Porsiyon cozumlenemedi.");
      }

      setSelectedFoodId(foodId);
      setSearchTerm(foodName);
      setNewAmount(Math.round(grams * 10) / 10);
      setPortionMessage(`${resolved.quantity} ${resolved.unit} ${foodName} = ${Math.round(grams * 10) / 10} g`);
    } catch (error) {
      setPortionMessage(error.message || "Porsiyon cozumlenemedi.");
    } finally {
      setPortionBusy(false);
    }
  }

  function amountFor(item) {
    const local = localAmounts[item.id];
    return Number.isFinite(local) ? local : item.amountGrams || 0;
  }

  async function saveItem(item) {
    await onSaveAmount(item.id, amountFor(item));
  }

  async function removeItem(item) {
    setLocalAmounts((current) => ({ ...current, [item.id]: 0 }));
    await onSaveAmount(item.id, 0);
  }

  return (
    <section className="page-screen">
      <header className="screen-top panel-glass">
        <div className="screen-top-main">
          <div>
            <p className="kicker">My Ingredients</p>
            <h1 className="screen-title">Malzemelerim</h1>
            <p className="screen-subtitle">Hazir listeden sec veya porsiyon ifadesiyle ekle: 1 egg, 1 cup rice.</p>
          </div>
        </div>
      </header>

      <section className="panel panel-glass inventory-add-panel">
        <div className="section-head">
          <h2 className="section-title">Malzeme Ekle</h2>
          <span className="section-meta">Katalog: {catalog.length} urun</span>
        </div>

        <div className="inventory-add-grid">
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Hazir listede ara"
            aria-label="Malzeme ara"
          />

          <select
            value={selectedFoodId}
            onChange={(event) => setSelectedFoodId(event.target.value)}
            aria-label="Malzeme sec"
          >
            <option value="">Malzeme sec</option>
            {filteredCatalog.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} ({item.type})
              </option>
            ))}
          </select>

          <NumberStepper
            compact
            value={newAmount}
            min={0.1}
            step={0.1}
            className="inventory-add-stepper"
            onChange={(next) => setNewAmount(Math.max(0.1, next))}
            inputAriaLabel="Eklenecek miktar"
            increaseAriaLabel="Miktari arttir"
            decreaseAriaLabel="Miktari azalt"
          />

          <button type="button" className="generate-btn" disabled={busy || !selectedFoodId} onClick={addItem}>
            Ekle
          </button>
        </div>

        <div className="inventory-portion-row">
          <input
            type="text"
            value={portionExpression}
            onChange={(event) => setPortionExpression(event.target.value)}
            placeholder="Hizli porsiyon (orn: 1 egg, 2 yumurta, 1 cup rice)"
            aria-label="Hizli porsiyon"
          />
          <button
            type="button"
            className="swap-btn"
            disabled={busy || portionBusy || !portionExpression.trim()}
            onClick={resolvePortionExpression}
          >
            Cozumle
          </button>
        </div>
        {portionMessage ? <p className="inventory-portion-hint">{portionMessage}</p> : null}
      </section>

      {activeItems.length === 0 ? (
        <section className="panel panel-glass inventory-panel">
          <p className="screen-subtitle">Henuz malzeme eklenmemis. Ustteki hazir listeden ekleyebilirsin.</p>
        </section>
      ) : null}

      {Object.entries(grouped)
        .filter(([, groupItems]) => groupItems.length > 0)
        .map(([groupKey, groupItems]) => (
        <section key={groupKey} className="panel panel-glass inventory-panel">
          <div className="section-head">
            <h2 className="section-title">{groupKey}</h2>
            <span className="section-meta">{groupItems.length} urun</span>
          </div>

          <div className="inventory-list">
            {groupItems.map((item) => (
              <article key={item.id} className="inventory-row">
                <div>
                  <h4>{item.name}</h4>
                  <p>
                    P {Math.round(item.protein)} · C {Math.round(item.carb)} · F {Math.round(item.fat)}
                  </p>
                </div>

                <div className="inventory-input-wrap">
                  <span className="inventory-unit">Miktar (g)</span>
                  <NumberStepper
                    compact
                    value={amountFor(item)}
                    min={0}
                    step={0.1}
                    className="inventory-row-stepper"
                    onChange={(next) =>
                      setLocalAmounts((current) => ({
                        ...current,
                        [item.id]: Math.max(0, next)
                      }))
                    }
                    inputAriaLabel={`${item.name} miktar`}
                    increaseAriaLabel={`${item.name} miktar arttir`}
                    decreaseAriaLabel={`${item.name} miktar azalt`}
                  />
                  <button type="button" className="swap-btn" disabled={busy} onClick={() => saveItem(item)}>
                    Kaydet
                  </button>
                  <button type="button" className="remove-food-btn" disabled={busy} onClick={() => removeItem(item)}>
                    Sil
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
        ))}
    </section>
  );
}
