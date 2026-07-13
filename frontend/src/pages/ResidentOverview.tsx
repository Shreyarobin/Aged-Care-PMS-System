import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

type Resident = {
  id: number;
  full_name: string;
  nhi_number: string;
  funding_category: string;
  admission_date: string;
  discharge_date: string | null;
};

type RiskAlert = {
  resident_id: number;
  full_name: string;
  risk_probability: number;
  risk_level: "medium" | "high";
  trend: string | null;
};

export default function ResidentOverview() {
  const { token, logout } = useAuth();
  const navigate = useNavigate();
  const [residents, setResidents] = useState<Resident[]>([]);
  const [riskAlerts, setRiskAlerts] = useState<RiskAlert[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("http://127.0.0.1:8000/residents", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) {
          logout();
          navigate("/login");
          throw new Error("Session expired");
        }
        return res.json();
      })
      .then((data) => setResidents(data))
      .catch(() => setError("Could not load residents"));
  }, [token]);

  useEffect(() => {
    const fetchAlerts = () => {
      fetch("http://127.0.0.1:8000/risk-alerts", {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => (res.ok ? res.json() : []))
        .then((data) => setRiskAlerts(data))
        .catch(() => {
          // Risk alerts are supplementary — a failed fetch shouldn't block
          // the resident list itself from working, so we just skip silently.
        });
    };

    fetchAlerts();
    const interval = setInterval(fetchAlerts, 60000);
    return () => clearInterval(interval);
  }, [token]);

  const riskByResident = new Map<number, RiskAlert>(riskAlerts.map((a) => [a.resident_id, a]));
  const highCount = riskAlerts.filter((a) => a.risk_level === "high").length;
  const mediumCount = riskAlerts.filter((a) => a.risk_level === "medium").length;

  return (
    <div style={{ padding: "40px", maxWidth: "720px" }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
  <h1 style={{ fontSize: "22px", fontWeight: 500, margin: 0 }}>Resident overview</h1>
  <button
    onClick={() => navigate("/residents/new")}
    style={{ padding: "10px 18px", backgroundColor: "var(--color-teal)", color: "white", border: "none", borderRadius: "8px", fontSize: "14px", fontWeight: 500, cursor: "pointer" }}
  >
    + New resident
  </button>
</div>
      {error && <p style={{ color: "var(--color-coral-text)" }}>{error}</p>}
      {riskAlerts.length > 0 && (
        <div
          style={{
            backgroundColor: highCount > 0 ? "var(--color-coral-light)" : "var(--color-amber-light)",
            border: `1px solid ${highCount > 0 ? "var(--color-coral)" : "var(--color-amber)"}`,
            borderRadius: "10px",
            padding: "14px 18px",
            marginBottom: "20px",
            fontSize: "14px",
            color: highCount > 0 ? "var(--color-coral-text)" : "var(--color-amber-text)",
          }}
        >
          <strong>
            {highCount > 0 && `${highCount} resident${highCount > 1 ? "s" : ""} at high risk`}
            {highCount > 0 && mediumCount > 0 && " · "}
            {mediumCount > 0 && `${mediumCount} at medium risk`}
          </strong>
          {" "}— {riskAlerts.map((a) => a.full_name).join(", ")}
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {residents.map((resident, index) => {
          const alert = riskByResident.get(resident.id);
          return (
            <div
              key={resident.id}
              onClick={() => navigate(`/residents/${resident.id}`)}
              style={{
                backgroundColor: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                borderLeft: resident.discharge_date
                  ? "4px solid var(--color-border)"
                  : alert?.risk_level === "high"
                  ? "4px solid var(--color-coral)"
                  : alert?.risk_level === "medium"
                  ? "4px solid var(--color-amber)"
                  : "4px solid var(--color-teal)",
                borderRadius: "12px",
                padding: "16px 20px",
                cursor: "pointer",
                opacity: 0,
                animation: `fadeIn 0.4s ease-out ${index * 0.08}s forwards`,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ fontSize: "15px", fontWeight: 500 }}>{resident.full_name}</div>
                {alert && (
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 600,
                      padding: "2px 8px",
                      borderRadius: "999px",
                      backgroundColor: alert.risk_level === "high" ? "var(--color-coral-light)" : "var(--color-amber-light)",
                      color: alert.risk_level === "high" ? "var(--color-coral-text)" : "var(--color-amber-text)",
                      textTransform: "uppercase",
                      letterSpacing: "0.03em",
                    }}
                  >
                    {alert.risk_level} risk{alert.trend === "worsening" ? " · worsening" : ""}
                  </span>
                )}
              </div>
              <div style={{ fontSize: "13px", color: "var(--color-text-muted)", marginTop: "4px" }}>
                NHI {resident.nhi_number} · {resident.funding_category}
                {resident.discharge_date && " · Discharged"}
              </div>
            </div>
          );
        })}
      </div>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}