import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";

type OccupancyData = {
  total_beds: number;
  occupied: number;
  discharged: number;
  occupancy_rate: number;
};

type KpiData = {
  period: string;
  admissions: number;
  discharges: number;
  incidents: number;
  high_severity_incidents: number;
};

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div style={{
      backgroundColor: "var(--color-surface)",
      border: `1px solid ${accent ? "var(--color-teal)" : "var(--color-border)"}`,
      borderRadius: "12px",
      padding: "20px 24px",
      flex: 1,
      minWidth: "160px",
    }}>
      <p style={{ fontSize: "13px", color: "var(--color-text-muted)", marginBottom: "8px" }}>
        {label}
      </p>
      <p style={{ fontSize: "28px", fontWeight: 500, color: accent ? "var(--color-teal)" : "var(--color-text)" }}>
        {value}
      </p>
      {sub && (
        <p style={{ fontSize: "12px", color: "var(--color-text-muted)", marginTop: "4px" }}>
          {sub}
        </p>
      )}
    </div>
  );
}

export default function ManagerDashboard() {
  const { token } = useAuth();
  const [occupancy, setOccupancy] = useState<OccupancyData | null>(null);
  const [kpi, setKpi] = useState<KpiData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("http://127.0.0.1:8000/manager/occupancy", {
        headers: { Authorization: `Bearer ${token}` },
      }).then((res) => res.json()),
      fetch("http://127.0.0.1:8000/manager/kpi", {
        headers: { Authorization: `Bearer ${token}` },
      }).then((res) => res.json()),
    ]).then(([occ, kpiData]) => {
      setOccupancy(occ);
      setKpi(kpiData);
      setLoading(false);
    });
  }, [token]);

  if (loading) return (
    <div style={{ padding: "40px" }}>
      <p style={{ fontSize: "14px", color: "var(--color-text-muted)" }}>Loading...</p>
    </div>
  );

  return (
    <div style={{ padding: "40px", maxWidth: "860px" }}>
      <h1 style={{ fontSize: "22px", fontWeight: 500, marginBottom: "4px" }}>
        Manager dashboard
      </h1>
      <p style={{ fontSize: "14px", color: "var(--color-text-muted)", marginBottom: "32px" }}>
        Facility overview
      </p>

      {/* Occupancy section */}
      <h2 style={{ fontSize: "15px", fontWeight: 500, marginBottom: "12px" }}>
        Occupancy
      </h2>
      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "32px" }}>
        <StatCard
          label="Occupancy rate"
          value={`${occupancy!.occupancy_rate}%`}
          sub={`${occupancy!.occupied} of ${occupancy!.total_beds} beds`}
          accent
        />
        <StatCard
          label="Active residents"
          value={occupancy!.occupied}
        />
        <StatCard
          label="Discharged"
          value={occupancy!.discharged}
        />
        <StatCard
          label="Total beds"
          value={occupancy!.total_beds}
        />
      </div>

      {/* Divider */}
      <div style={{ borderTop: "1px solid var(--color-border)", marginBottom: "32px" }} />

      {/* KPI section */}
      <h2 style={{ fontSize: "15px", fontWeight: 500, marginBottom: "4px" }}>
        Activity — last 30 days
      </h2>
      <p style={{ fontSize: "13px", color: "var(--color-text-muted)", marginBottom: "12px" }}>
        Admissions, discharges, and incidents in the past 30 days
      </p>
      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "32px" }}>
        <StatCard
          label="Admissions"
          value={kpi!.admissions}
        />
        <StatCard
          label="Discharges"
          value={kpi!.discharges}
        />
        <StatCard
          label="Incidents"
          value={kpi!.incidents}
        />
        <StatCard
          label="High severity"
          value={kpi!.high_severity_incidents}
          accent={kpi!.high_severity_incidents > 0}
        />
      </div>

      {/* High severity alert */}
      {kpi!.high_severity_incidents > 0 && (
        <div style={{
          backgroundColor: "var(--color-coral-light)",
          border: "1px solid var(--color-coral)",
          borderRadius: "12px",
          padding: "16px 20px",
          display: "flex",
          alignItems: "center",
          gap: "12px",
        }}>
          <span style={{ fontSize: "18px" }}>⚠️</span>
          <p style={{ fontSize: "14px", color: "var(--color-coral-text)" }}>
            {kpi!.high_severity_incidents} high severity incident
            {kpi!.high_severity_incidents > 1 ? "s" : ""} in the last 30 days.
            Review the Incidents tab for each affected resident.
          </p>
        </div>
      )}
    </div>
  );
}