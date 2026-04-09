import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

function initialsFromName(name) {
  const text = String(name || "U").trim();
  if (!text) return "U";
  const pieces = text.split(/\s+/).slice(0, 2);
  return pieces.map((piece) => piece[0]?.toUpperCase() || "").join("");
}

export default function ProfileAvatarMenu({ user, onLogout }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    function handleClick(event) {
      if (wrapRef.current && !wrapRef.current.contains(event.target)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  if (!user) {
    return (
      <button type="button" className="profile-avatar-btn" onClick={() => navigate("/login")}>
        <span>U</span>
      </button>
    );
  }

  return (
    <div className="profile-menu-wrap" ref={wrapRef}>
      <button type="button" className="profile-avatar-btn" onClick={() => setOpen((current) => !current)}>
        <span>{initialsFromName(user.displayName)}</span>
      </button>

      {open ? (
        <div className="profile-dropdown panel-glass">
          <button type="button" onClick={() => { navigate("/profile"); setOpen(false); }}>
            Profil
          </button>
          <button type="button" onClick={() => { navigate("/settings"); setOpen(false); }}>
            Ayarlar
          </button>
          <button type="button" onClick={() => { setOpen(false); onLogout(); }}>
            Cikis Yap
          </button>
        </div>
      ) : null}
    </div>
  );
}
