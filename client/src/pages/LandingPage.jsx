import { Link, useNavigate } from "react-router-dom";

export default function LandingPage({ isAuthenticated }) {
  const navigate = useNavigate();

  return (
    <main className="landing-shell">
      <header className="landing-topbar">
        <button type="button" className="landing-profile-btn" onClick={() => navigate(isAuthenticated ? "/dashboard" : "/login")}> 
          <span aria-hidden="true">◉</span>
        </button>
      </header>

      <section className="landing-hero panel-glass">
        <div className="landing-hero-art" aria-hidden="true" />
        <p className="kicker">Meal Forge</p>
        <h1 className="screen-title">Smarter Meal Planning with Macro Control</h1>
        <p className="screen-subtitle">
          Malzemelerini yonet, hedeflerine gore plan olustur, checkout analizleriyle daha net karar ver.
        </p>

        <div className="landing-actions">
          <Link to="/login" className="generate-btn landing-login-btn">
            Giris Yap
          </Link>
        </div>
      </section>
    </main>
  );
}
