import { useMemo, useState } from "react";
import { recipeCards, recipeCategories, recipeSections } from "../data/recipes.js";

function RecipeHeroCard({ recipe, onAdd }) {
  return (
    <article className="recipe-hero-card" style={{ backgroundImage: `url(${recipe.image})` }}>
      <div className="recipe-hero-overlay" />
      <div className="recipe-hero-body">
        <div className="recipe-tags">
          <span>{recipe.tag}</span>
          <span>{recipe.prepMinutes} Min Prep</span>
        </div>

        <h3>{recipe.title}</h3>

        <div className="recipe-macro-line">
          <strong>{recipe.protein}g</strong>
          <strong>{recipe.carb}g</strong>
          <strong>{recipe.fat}g</strong>
          <strong>{recipe.calories}</strong>
        </div>

        <button type="button" className="generate-btn" onClick={() => onAdd(recipe)}>
          Add To Plan
        </button>
      </div>
    </article>
  );
}

function RecipeListItem({ recipe, onAdd }) {
  return (
    <article className="recipe-list-item panel-glass">
      <div className="recipe-list-thumb" style={{ backgroundImage: `url(${recipe.image})` }} />

      <div className="recipe-list-copy">
        <h4>{recipe.title}</h4>
        <p>
          <span>{recipe.calories} kcal</span>
          <span>P {recipe.protein}g</span>
          <span>C {recipe.carb}g</span>
        </p>
      </div>

      <button type="button" className="recipe-plus" onClick={() => onAdd(recipe)}>
        +
      </button>
    </article>
  );
}

export default function RecipesPage({ onAddToCart }) {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [showAllRecommended, setShowAllRecommended] = useState(false);
  const [expandedSections, setExpandedSections] = useState({});

  const filtered = useMemo(() => {
    return recipeCards.filter((recipe) => {
      const byCategory = activeCategory === "all" ? true : recipe.category === activeCategory;
      const byText = query
        ? `${recipe.title} ${recipe.tag}`.toLowerCase().includes(query.toLowerCase())
        : true;
      return byCategory && byText;
    });
  }, [query, activeCategory]);

  return (
    <section className="page-screen">
      <header className="screen-top panel-glass">
        <div className="screen-top-main">
          <div>
            <p className="kicker">Recipes</p>
            <h1 className="screen-title">Performance Recipes</h1>
            <p className="screen-subtitle">Fuel your body with precision-crafted nutrition.</p>
          </div>

          <div className="screen-actions" aria-hidden="true">
            <span className="action-dot action-dot-soft" />
            <span className="action-dot action-dot-strong" />
          </div>
        </div>

        <div className="status-chip-row">
          <span className="status-chip status-chip-green">500+ Recipes</span>
          <span className="status-chip">Daily Picks</span>
          <span className="status-chip">Quick Prep</span>
        </div>
      </header>

      <section className="panel panel-glass">
        <input
          className="recipe-search"
          placeholder="Search 500+ performance recipes"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />

        <div className="category-row">
          {recipeCategories.map((category) => (
            <button
              key={category}
              type="button"
              className={`category-pill ${activeCategory === category ? "category-pill-active" : ""}`}
              onClick={() => setActiveCategory(category)}
            >
              {category}
            </button>
          ))}
        </div>
      </section>

      <section className="panel panel-glass">
        <div className="section-head">
          <h2 className="section-title">Recommended For You</h2>
          <button type="button" className="text-link-btn" onClick={() => setShowAllRecommended((prev) => !prev)}>
            {showAllRecommended ? "Kucult" : "View All"}
          </button>
        </div>

        <div className="recipe-hero-grid">
          {(showAllRecommended ? filtered : filtered.slice(0, 2)).map((recipe) => (
            <RecipeHeroCard key={recipe.id} recipe={recipe} onAdd={onAddToCart} />
          ))}
        </div>
      </section>

      {recipeSections.map((section) => {
        const items = section.items
          .map((id) => recipeCards.find((recipe) => recipe.id === id))
          .filter(Boolean);

        const isExpanded = Boolean(expandedSections[section.id]);
        const visibleItems = isExpanded ? items : items.slice(0, 2);

        return (
          <section key={section.id} className="panel panel-glass">
            <div className="section-head">
              <h2 className="section-title">{section.title}</h2>
              <button
                type="button"
                className="text-link-btn"
                onClick={() =>
                  setExpandedSections((current) => ({
                    ...current,
                    [section.id]: !current[section.id]
                  }))
                }
              >
                {isExpanded ? "Kucult" : "View All"}
              </button>
            </div>

            <div className="recipe-list-grid">
              {visibleItems.map((recipe) => (
                <RecipeListItem key={recipe.id} recipe={recipe} onAdd={onAddToCart} />
              ))}
            </div>
          </section>
        );
      })}
    </section>
  );
}
