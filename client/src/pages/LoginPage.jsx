import { useState } from "react";
import { Link } from "react-router-dom";

export default function LoginPage({ onLogin, onRegister, busy, error }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("Meal User");
  const [mode, setMode] = useState("login");

  function handleSubmit(event) {
    event.preventDefault();
    if (mode === "register") {
      onRegister({ email, password, displayName });
      return;
    }

    onLogin({ email, password });
  }

  return (
    <main className="landing-shell">
      <section className="panel panel-glass auth-card">
        <p className="kicker">Authentication</p>
        <h1 className="screen-title">{mode === "register" ? "Kayit Ol" : "Giris Yap"}</h1>
        <p className="screen-subtitle">{mode === "register" ? "Yeni hesap olustur." : "Hesabinla giris yap."}</p>

        <div className="mode-row mode-row-no-top">
          <button type="button" className={`mode-pill ${mode === "login" ? "mode-pill-active" : ""}`} onClick={() => setMode("login")}>
            Giris
          </button>
          <button type="button" className={`mode-pill ${mode === "register" ? "mode-pill-active" : ""}`} onClick={() => setMode("register")}>
            Kayit
          </button>
        </div>

        {error ? <p className="error-banner">{error}</p> : null}

        <form className="auth-form" onSubmit={handleSubmit}>
          {mode === "register" ? (
            <label className="field">
              <span>Ad Soyad</span>
              <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
            </label>
          ) : null}

          <label className="field">
            <span>Email</span>
            <input value={email} onChange={(event) => setEmail(event.target.value)} />
          </label>

          <label className="field">
            <span>Password</span>
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
          </label>

          <button type="submit" className="generate-btn" disabled={busy}>
            {busy ? "Islem yapiliyor..." : mode === "register" ? "Kayit Ol" : "Giris Yap"}
          </button>
        </form>

        <Link className="landing-back-link" to="/landing">
          Landing sayfasina don
        </Link>
      </section>
    </main>
  );
}
