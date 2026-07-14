import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Percent, Users, DoorOpen, BedDouble, UserPlus, UserMinus, AlertCircle, AlertTriangle } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Card } from "../components/ui/Card";
import { Alert } from "../components/ui/Alert";

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

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/** Animates from 0 to `value` on mount/update — a genuine counting-up
 * animation via plain requestAnimationFrame + manual easing (kept simple
 * and dependency-free for this specific piece, rather than relying on
 * Framer Motion's animate() utility, which has some Web Animations API
 * assumptions that don't matter in a real browser but make this harder to
 * verify in isolation). Supports decimals for percentages. */
function AnimatedNumber({ value, decimals = 0, suffix = "" }: { value: number; decimals?: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const duration = 800;
    const start = performance.now();
    let frameId: number;

    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutCubic(progress);
      const current = value * eased;
      if (node) node.textContent = current.toFixed(decimals) + suffix;
      if (progress < 1) {
        frameId = requestAnimationFrame(tick);
      }
    }

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [value, decimals, suffix]);

  return <span ref={ref}>{(0).toFixed(decimals) + suffix}</span>;
}

function StatCard({
  label,
  value,
  decimals,
  suffix,
  sub,
  accent,
  icon: Icon,
  delay = 0,
}: {
  label: string;
  value: number;
  decimals?: number;
  suffix?: string;
  sub?: string;
  accent?: boolean;
  icon: React.ComponentType<{ size?: number }>;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut", delay }}
      style={{ flex: 1, minWidth: "160px" }}
    >
      <Card style={{ borderColor: accent ? "var(--color-teal)" : "var(--color-border)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-2)" }}>
          <p style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)" }}>{label}</p>
          <Icon size={16} />
        </div>
        <p style={{ fontSize: "var(--font-size-2xl)", fontWeight: "var(--font-weight-semibold)", color: accent ? "var(--color-teal)" : "var(--color-text)" }}>
          <AnimatedNumber value={value} decimals={decimals} suffix={suffix} />
        </p>
        {sub && (
          <p style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", marginTop: "var(--space-1)" }}>
            {sub}
          </p>
        )}
      </Card>
    </motion.div>
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

  if (loading) {
    return (
      <div style={{ padding: "var(--space-10)" }}>
        <p style={{ fontSize: "var(--font-size-base)", color: "var(--color-text-muted)" }}>Loading...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "var(--space-10)", maxWidth: "860px" }}>
      <h1 style={{ fontSize: "var(--font-size-xl)", fontWeight: "var(--font-weight-semibold)", marginBottom: "var(--space-1)" }}>
        Manager dashboard
      </h1>
      <p style={{ fontSize: "var(--font-size-base)", color: "var(--color-text-muted)", marginBottom: "var(--space-8)" }}>
        Facility overview
      </p>

      {/* Occupancy section */}
      <h2 style={{ fontSize: "var(--font-size-md)", fontWeight: "var(--font-weight-medium)", marginBottom: "var(--space-3)" }}>
        Occupancy
      </h2>
      <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap", marginBottom: "var(--space-8)" }}>
        <StatCard
          label="Occupancy rate"
          value={occupancy!.occupancy_rate}
          decimals={1}
          suffix="%"
          sub={`${occupancy!.occupied} of ${occupancy!.total_beds} beds`}
          accent
          icon={Percent}
          delay={0}
        />
        <StatCard label="Active residents" value={occupancy!.occupied} icon={Users} delay={0.05} />
        <StatCard label="Discharged" value={occupancy!.discharged} icon={DoorOpen} delay={0.1} />
        <StatCard label="Total beds" value={occupancy!.total_beds} icon={BedDouble} delay={0.15} />
      </div>

      <div style={{ borderTop: "1px solid var(--color-border)", marginBottom: "var(--space-8)" }} />

      {/* KPI section */}
      <h2 style={{ fontSize: "var(--font-size-md)", fontWeight: "var(--font-weight-medium)", marginBottom: "var(--space-1)" }}>
        Activity — last 30 days
      </h2>
      <p style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)", marginBottom: "var(--space-3)" }}>
        Admissions, discharges, and incidents in the past 30 days
      </p>
      <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap", marginBottom: "var(--space-8)" }}>
        <StatCard label="Admissions" value={kpi!.admissions} icon={UserPlus} delay={0.2} />
        <StatCard label="Discharges" value={kpi!.discharges} icon={UserMinus} delay={0.25} />
        <StatCard label="Incidents" value={kpi!.incidents} icon={AlertCircle} delay={0.3} />
        <StatCard
          label="High severity"
          value={kpi!.high_severity_incidents}
          accent={kpi!.high_severity_incidents > 0}
          icon={AlertTriangle}
          delay={0.35}
        />
      </div>

      {kpi!.high_severity_incidents > 0 && (
        <Alert variant="danger">
          {kpi!.high_severity_incidents} high severity incident
          {kpi!.high_severity_incidents > 1 ? "s" : ""} in the last 30 days. Review the Incidents tab for each affected resident.
        </Alert>
      )}
    </div>
  );
}