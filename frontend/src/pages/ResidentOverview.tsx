import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Alert } from "../components/ui/Alert";

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
    <div style={{ padding: "var(--space-10)", maxWidth: "760px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-6)" }}>
        <h1 style={{ fontSize: "var(--font-size-xl)", fontWeight: "var(--font-weight-semibold)" }}>Resident overview</h1>
        <Button onClick={() => navigate("/residents/new")}>
          <Plus size={16} />
          New resident
        </Button>
      </div>

      {error && (
        <div style={{ marginBottom: "var(--space-4)" }}>
          <Alert variant="danger">{error}</Alert>
        </div>
      )}

      {riskAlerts.length > 0 && (
        <div style={{ marginBottom: "var(--space-5)" }}>
          <Alert variant={highCount > 0 ? "danger" : "warning"}>
            <strong>
              {highCount > 0 && `${highCount} resident${highCount > 1 ? "s" : ""} at high risk`}
              {highCount > 0 && mediumCount > 0 && " · "}
              {mediumCount > 0 && `${mediumCount} at medium risk`}
            </strong>
            {" "}— {riskAlerts.map((a) => a.full_name).join(", ")}
          </Alert>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
        {residents.map((resident, index) => {
          const alert = riskByResident.get(resident.id);
          const accentColor = resident.discharge_date
            ? "var(--color-border)"
            : alert?.risk_level === "high"
            ? "var(--color-coral)"
            : alert?.risk_level === "medium"
            ? "var(--color-amber)"
            : "var(--color-teal)";

          return (
            <motion.div
              key={resident.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: "easeOut", delay: index * 0.05 }}
            >
              <Card interactive onClick={() => navigate(`/residents/${resident.id}`)} style={{ borderLeft: `4px solid ${accentColor}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                  <div style={{ fontSize: "var(--font-size-md)", fontWeight: "var(--font-weight-medium)" }}>
                    {resident.full_name}
                  </div>
                  {alert && (
                    <Badge variant={alert.risk_level === "high" ? "danger" : "warning"} size="sm">
                      {alert.risk_level} risk{alert.trend === "worsening" ? " · worsening" : ""}
                    </Badge>
                  )}
                </div>
                <div style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)", marginTop: "var(--space-1)" }}>
                  NHI {resident.nhi_number} · {resident.funding_category}
                  {resident.discharge_date && " · Discharged"}
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}