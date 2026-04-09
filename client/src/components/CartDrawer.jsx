export default function CartDrawer({
  open,
  items,
  onClose,
  onIncrement,
  onDecrement,
  onRemove,
  onClearAll,
  onCheckout,
  onOpenInsights,
  hasInsights,
  checkoutBusy
}) {
  const subtotalCalories = items.reduce((acc, item) => acc + item.calories * item.qty, 0);

  return (
    <>
      <div className={`cart-backdrop ${open ? "cart-backdrop-open" : ""}`} onClick={onClose} aria-hidden="true" />
      <aside className={`cart-drawer ${open ? "cart-drawer-open" : ""}`} aria-label="Cart">
        <header className="cart-head">
          <h3>Plan Cart</h3>
          <button type="button" onClick={onClose}>
            Close
          </button>
        </header>

        {!items.length ? (
          <p className="cart-empty">Cart bos. Recipes veya meal kartlarindan urun ekleyebilirsin.</p>
        ) : (
          <div className="cart-list">
            {items.map((item) => (
              <article key={item.id} className="cart-item">
                <div>
                  <h4>{item.title}</h4>
                  <p>{item.calories} kcal · P {item.protein}g · C {item.carb}g · F {item.fat}g</p>
                </div>

                <div className="cart-actions">
                  <button type="button" onClick={() => onDecrement(item.id)}>-</button>
                  <span>{item.qty}</span>
                  <button type="button" onClick={() => onIncrement(item.id)}>+</button>
                  <button type="button" className="cart-remove" onClick={() => onRemove(item.id)}>
                    Remove
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}

        <footer className="cart-foot">
          <div className="cart-total-wrap">
            <span>Total</span>
            <strong>{Math.round(subtotalCalories)} kcal</strong>
          </div>
          <div className="cart-foot-actions">
            <button type="button" className="cart-checkout-btn" disabled={!items.length || checkoutBusy} onClick={onCheckout}>
              {checkoutBusy ? "Analyzing..." : "Checkout Plan"}
            </button>
            <button type="button" className="cart-insight-btn" disabled={!hasInsights} onClick={onOpenInsights}>
              Analyze Detail
            </button>
            <button type="button" className="cart-clear-btn" disabled={!items.length} onClick={onClearAll}>
              Hepsini Sil
            </button>
          </div>
        </footer>
      </aside>
    </>
  );
}
