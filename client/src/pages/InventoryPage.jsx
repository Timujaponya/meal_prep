import { useMemo, useState } from "react";

export default function InventoryPage({ items = [], catalog = [], onSaveAmount, busy }) {
  const [localAmounts, setLocalAmounts] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFoodId, setSelectedFoodId] = useState("");
  const [newAmount, setNewAmount] = useState(100);

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
    const amount = Math.max(1, Math.round(Number(newAmount) || 0));
    if (!selectedFoodId) {
      return;
    }

    const existingAmount = Number(items.find((item) => item.id === selectedFoodId)?.amountGrams) || 0;
    const nextAmount = existingAmount + amount;

    await onSaveAmount(selectedFoodId, nextAmount);
    setSelectedFoodId("");
    setSearchTerm("");
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
            <p className="screen-subtitle">Hazir listeden sec, malzemeni gram (g) cinsinden ekle ve yonet.</p>
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

          <input
            type="number"
            min="1"
            value={newAmount}
            onChange={(event) => setNewAmount(Math.max(1, Number(event.target.value) || 1))}
            aria-label="Eklenecek miktar"
          />

          <button type="button" className="generate-btn" disabled={busy || !selectedFoodId} onClick={addItem}>
            Ekle
          </button>
        </div>
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
                  <input
                    type="number"
                    min="0"
                    value={amountFor(item)}
                    onChange={(event) =>
                      setLocalAmounts((current) => ({
                        ...current,
                        [item.id]: Math.max(0, Number(event.target.value) || 0)
                      }))
                    }
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
