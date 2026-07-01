import { Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function FamilyLayout() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div style={{ minHeight: "100vh" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 40px", borderBottom: "1px solid var(--color-border)" }}>
        <p style={{ fontSize: "15px", fontWeight: 500 }}>Family portal</p>
        <button
          onClick={handleLogout}
          style={{ background: "none", border: "none", color: "var(--color-text-muted)", fontSize: "14px", cursor: "pointer" }}
        >
          Sign out
        </button>
      </header>
      <main style={{ maxWidth: "640px", margin: "0 auto" }}>
        <Outlet />
      </main>
    </div>
  );
}