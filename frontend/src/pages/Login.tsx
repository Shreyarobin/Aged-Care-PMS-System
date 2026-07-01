import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  function decodeRole(token: string): string {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.role;
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("http://127.0.0.1:8000/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || "Login failed");
      }

      const data = await response.json();
      const role = decodeRole(data.access_token);
      login(data.access_token, role);
      navigate(role === "family" ? "/family" : "/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
      <form onSubmit={handleLogin} style={{ width: "320px" }}>
        <h1 style={{ fontSize: "22px", fontWeight: 500, marginBottom: "24px" }}>Sign in</h1>
        <label style={{ fontSize: "13px", color: "var(--color-text-muted)" }}>Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{ display: "block", width: "100%", padding: "10px 12px", marginTop: "4px", marginBottom: "16px", border: "1px solid var(--color-border)", borderRadius: "8px", fontSize: "14px" }}
        />
        <label style={{ fontSize: "13px", color: "var(--color-text-muted)" }}>Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{ display: "block", width: "100%", padding: "10px 12px", marginTop: "4px", marginBottom: "20px", border: "1px solid var(--color-border)", borderRadius: "8px", fontSize: "14px" }}
        />
        {error && <p style={{ color: "var(--color-coral-text)", fontSize: "13px", marginBottom: "16px" }}>{error}</p>}
        <button type="submit" disabled={loading} style={{ width: "100%", padding: "12px", backgroundColor: "var(--color-teal)", color: "white", border: "none", borderRadius: "8px", fontSize: "14px", fontWeight: 500 }}>
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </div>
  );
}