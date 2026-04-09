import { NavLink } from "react-router-dom";

const navItems = [
  { path: "/dashboard", label: "Dashboard", iconClass: "icon-dashboard" },
  { path: "/planner", label: "Planner", iconClass: "icon-planner" },
  { path: "/recipes", label: "Recipes", iconClass: "icon-recipes" },
  { path: "/inventory", label: "My Items", iconClass: "icon-inventory" }
];

export default function BottomNav({ cartCount = 0, onOpenCart }) {
  return (
    <nav className="bottom-nav panel-glass" aria-label="Main Navigation">
      {navItems.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          className={({ isActive }) => `bottom-nav-item ${isActive ? "bottom-nav-item-active" : ""}`}
        >
          <span className={`bottom-nav-icon ${item.iconClass}`} aria-hidden="true" />
          <span className="bottom-nav-label">{item.label}</span>
        </NavLink>
      ))}

      <button type="button" className="bottom-nav-item bottom-nav-cart" onClick={onOpenCart}>
        <span className="bottom-nav-icon icon-cart" aria-hidden="true" />
        <span className="bottom-nav-label">Cart</span>
        {cartCount > 0 ? <em>{cartCount}</em> : null}
      </button>
    </nav>
  );
}
