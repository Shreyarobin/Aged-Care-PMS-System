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

export default function ResidentOverview() {
  const { token, logout } = useAuth();
  const navigate = useNavigate();
  const [residents, setResidents] = useState<Resident[]>([]);
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
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {residents.map((resident, index) => (
          <div
            key={resident.id}
            onClick={() => navigate(`/residents/${resident.id}`)}
            style={{
              backgroundColor: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderLeft: resident.discharge_date ? "4px solid var(--color-border)" : "4px solid var(--color-teal)",
              borderRadius: "12px",
              padding: "16px 20px",
              cursor: "pointer",
              opacity: 0,
              animation: `fadeIn 0.4s ease-out ${index * 0.08}s forwards`,
            }}
          >
            <div style={{ fontSize: "15px", fontWeight: 500 }}>{resident.full_name}</div>
            <div style={{ fontSize: "13px", color: "var(--color-text-muted)", marginTop: "4px" }}>
              NHI {resident.nhi_number} · {resident.funding_category}
              {resident.discharge_date && " · Discharged"}
            </div>
          </div>
        ))}
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