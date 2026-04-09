export default function ProfilePage({ user }) {
  return (
    <section className="page-screen">
      <section className="panel panel-glass">
        <p className="kicker">Profile</p>
        <h1 className="screen-title">{user?.displayName || "User"}</h1>
        <p className="screen-subtitle">Email: {user?.email || "-"}</p>
      </section>
    </section>
  );
}
