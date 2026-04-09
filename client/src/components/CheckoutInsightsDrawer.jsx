export default function CheckoutInsightsDrawer({ open, analysis, onClose }) {
  if (!analysis) {
    return null;
  }

  const ingredient = analysis.ingredient || { missing: [], complete: [] };
  const macros = analysis.macros || {};
  const feedback = analysis.feedback || { macros: [], ingredients: [], summary: "" };

  function toDisplay(value, unit = "") {
    return `${Math.round((Number(value) || 0) * 10) / 10}${unit}`;
  }

  return (
    <>
      <div className={`insights-backdrop ${open ? "insights-backdrop-open" : ""}`} onClick={onClose} aria-hidden="true" />
      <aside className={`insights-drawer ${open ? "insights-drawer-open" : ""}`} aria-label="Checkout Insights">
        <header className="insights-head">
          <div>
            <h3>Checkout Analysis</h3>
            <p>{feedback.summary || "Cart ve inventory karsilastirmasi"}</p>
          </div>
          <button type="button" onClick={onClose}>
            Close
          </button>
        </header>

        <section className="insights-section">
          <h4>Gunluk Makro-Kalori Karsilastirmasi</h4>
          <div className="insights-grid">
            <article>
              <span>Hedef Kalori</span>
              <strong>{toDisplay(macros.target?.calories, " kcal")}</strong>
            </article>
            <article>
              <span>Onceki Toplam</span>
              <strong>{toDisplay(macros.previousTotals?.calories, " kcal")}</strong>
            </article>
            <article>
              <span>Cart Toplami</span>
              <strong>{toDisplay(macros.cartTotals?.calories, " kcal")}</strong>
            </article>
            <article>
              <span>Checkout Sonrasi</span>
              <strong>{toDisplay(macros.projectedTotals?.calories, " kcal")}</strong>
            </article>
          </div>

          <div className="insights-list-wrap">
            <strong>Makro Durumu</strong>
            <ul>
              {(feedback.macros || []).map((item) => (
                <li key={item.key}>{item.message}</li>
              ))}
            </ul>
          </div>
        </section>

        <section className="insights-section">
          <h4>Inventory Malzeme Karsilastirmasi</h4>
          <p className="insights-copy">{ingredient.note || "Malzeme karsilastirmasi"}</p>

          <div className="insights-list-wrap">
            <strong>Eksik Malzemeler</strong>
            {!ingredient.missing?.length ? (
              <p className="insights-copy">Eksik malzeme yok.</p>
            ) : (
              <ul>
                {ingredient.missing.map((item) => (
                  <li key={`missing_${item.id}`}>
                    {item.name}: {item.missingGrams}g eksik (gereken {item.requiredGrams}g / stok {item.availableGrams}g)
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="insights-list-wrap">
            <strong>Tam Karsilanan Malzemeler</strong>
            {!ingredient.complete?.length ? (
              <p className="insights-copy">Tam karsilanan malzeme yok.</p>
            ) : (
              <ul>
                {ingredient.complete.map((item) => (
                  <li key={`complete_${item.id}`}>
                    {item.name}: gereken {item.requiredGrams}g / stok {item.availableGrams}g
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </aside>
    </>
  );
}