import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";
import { Alert } from "../components/ui/Alert";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  function decodeRole(token: string): string {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.role;
  }

  async function handleLogin(e: FormEvent) {
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
    <div style={{ display: "flex", minHeight: "100vh" }}>
      {/* Left panel — branding. Purely CSS gradient + typography, no
          external illustration assets, matching the "professional, not
          flashy" tone rather than generic stock-illustration styling. */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "var(--space-12)",
          background: "linear-gradient(135deg, var(--color-teal) 0%, var(--color-teal-dark) 100%)",
          color: "#ffffff",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          style={{ maxWidth: "420px", position: "relative", zIndex: 1 }}
        >
          <div
            style={{
              fontSize: "var(--font-size-2xl)",
              fontWeight: "var(--font-weight-semibold)",
              marginBottom: "var(--space-4)",
            }}
          >
            CareStack
          </div>
          <div
            style={{
              fontSize: "var(--font-size-lg)",
              fontWeight: "var(--font-weight-normal)",
              lineHeight: "var(--line-height-normal)",
              opacity: 0.92,
            }}
          >
            AI-enhanced aged care practice management, built for New Zealand residential care teams.
          </div>
        </motion.div>

        {/* Subtle decorative shapes — CSS only, no assets */}
        <div
          style={{
            position: "absolute",
            top: "-60px",
            right: "-60px",
            width: "220px",
            height: "220px",
            borderRadius: "50%",
            backgroundColor: "rgba(255,255,255,0.06)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-80px",
            right: "80px",
            width: "180px",
            height: "180px",
            borderRadius: "50%",
            backgroundColor: "rgba(255,255,255,0.05)",
          }}
        />
      </div>

      {/* Right panel — the actual login form */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "var(--space-6)" }}>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          style={{ width: "100%", maxWidth: "380px" }}
        >
          <Card padding="lg">
            <form onSubmit={handleLogin}>
              <h1
                style={{
                  fontSize: "var(--font-size-xl)",
                  fontWeight: "var(--font-weight-semibold)",
                  marginBottom: "var(--space-2)",
                }}
              >
                Sign in
              </h1>
              <p
                style={{
                  fontSize: "var(--font-size-sm)",
                  color: "var(--color-text-muted)",
                  marginBottom: "var(--space-6)",
                }}
              >
                Welcome back — enter your details to continue.
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
                <Input
                  label="Email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />

                <Input
                  label="Password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  rightElement={
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "var(--color-text-muted)",
                        fontSize: "var(--font-size-xs)",
                        fontWeight: "var(--font-weight-medium)",
                        cursor: "pointer",
                        padding: "6px 8px",
                      }}
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  }
                />

                {error && <Alert variant="danger">{error}</Alert>}

                <Button type="submit" loading={loading} fullWidth size="lg" style={{ marginTop: "var(--space-2)" }}>
                  {loading ? "Signing in..." : "Sign in"}
                </Button>
              </div>
            </form>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}