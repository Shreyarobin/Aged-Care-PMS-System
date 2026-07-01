import { Link, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function StaffLayout() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  const linkStyle = {
    display: "block",
    padding: "10px 16px",
    fontSize: "14px",
    color: "var(--color-text)",
    textDecoration: "none",
    borderRadius: "8px",
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <nav style={{ width: "220px", borderRight: "1px solid var(--color-border)", padding: "24px 12px", display: "flex", flexDirection: "column" }}>
        <p style={{ fontSize: "13px", fontWeight: 500, color: "var(--color-text-muted)", padding: "0 16px", marginBottom: "16px" }}>
          PMS Platform
        </p>
        <Link to="/" style={linkStyle}>Resident overview</Link>

        <div style={{ marginTop: "auto" }}>
          <button
            onClick={handleLogout}
            style={{ width: "100%", textAlign: "left", padding: "10px 16px", fontSize: "14px", background: "none", border: "none", color: "var(--color-text-muted)", cursor: "pointer" }}
          >
            Sign out
          </button>
        </div>
      </nav>

      <main style={{ flex: 1, overflow: "auto" }}>
        <Outlet />
      </main>
    </div>
  );
}