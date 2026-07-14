import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ShieldCheck, AlertCircle, Users } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";

type ResidentCompliance = {
  resident_id: number;
  resident_name: string;
  has_active_care_plan: boolean;
  has_recent_interrai: boolean;
  has_recent_notes: boolean;
  active_medication_orders: number;
};

type FacilityCompliance = {
  incidents_last_30_days: number;
  high_severity_last_30_days: number;
};

type ComplianceData = {
  generated_on: string;
  residents: ResidentCompliance[];
  facility: FacilityCompliance;
};

function CheckItem({ label, passed, clause }: { label: string; passed: boolean; clause: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "var(--space-3)",
        padding: "var(--space-2) 0",
        borderBottom: "1px solid var(--color-border)",
      }}
    >
      <Badge variant={passed ? "success" : "danger"} size="sm">
        {passed ? "Met" : "Gap"}
      </Badge>
      <div>
        <p style={{ fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-medium)" }}>{label}</p>
        <p style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", marginTop: "2px" }}>
          {clause}
        </p>
      </div>
    </div>
  );
}

function SummaryStat({
  label,
  value,
  sub,
  accent,
  icon: Icon,
  delay = 0,
}: {
  label: string;
  value: string;
  sub: string;
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
        <p
          style={{
            fontSize: "var(--font-size-2xl)",
            fontWeight: "var(--font-weight-semibold)",
            color: accent ? "var(--color-teal)" : "var(--color-text)",
          }}
        >
          {value}
        </p>
        <p style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", marginTop: "var(--space-1)" }}>{sub}</p>
      </Card>
    </motion.div>
  );
}

export default function ComplianceOverview() {
  const { token } = useAuth();
  const [data, setData] = useState<ComplianceData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("http://127.0.0.1:8000/manager/compliance", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((d) => {
        setData(d);
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

  const totalChecks = data!.residents.length * 3;
  const passedChecks = data!.residents.reduce((acc, r) => {
    return acc + (r.has_active_care_plan ? 1 : 0) + (r.has_recent_interrai ? 1 : 0) + (r.has_recent_notes ? 1 : 0);
  }, 0);
  const complianceRate = totalChecks > 0 ? Math.round((passedChecks / totalChecks) * 100) : 100;

  return (
    <div style={{ padding: "var(--space-10)", maxWidth: "860px" }}>
      <h1 style={{ fontSize: "var(--font-size-xl)", fontWeight: "var(--font-weight-semibold)", marginBottom: "var(--space-1)" }}>
        Compliance overview
      </h1>
      <p style={{ fontSize: "var(--font-size-base)", color: "var(--color-text-muted)", marginBottom: "var(--space-8)" }}>
        Ngā Paerewa NZS 8134:2021 · Generated {data!.generated_on}
      </p>

      <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap", marginBottom: "var(--space-8)" }}>
        <SummaryStat
          label="Overall compliance"
          value={`${complianceRate}%`}
          sub={`${passedChecks} of ${totalChecks} checks passed`}
          accent={complianceRate === 100}
          icon={ShieldCheck}
          delay={0}
        />
        <SummaryStat
          label="Incidents (30 days)"
          value={String(data!.facility.incidents_last_30_days)}
          sub={`${data!.facility.high_severity_last_30_days} high severity`}
          icon={AlertCircle}
          delay={0.05}
        />
        <SummaryStat
          label="Active residents"
          value={String(data!.residents.length)}
          sub="under review"
          icon={Users}
          delay={0.1}
        />
      </div>

      <div style={{ borderTop: "1px solid var(--color-border)", marginBottom: "var(--space-8)" }} />

      <h2 style={{ fontSize: "var(--font-size-md)", fontWeight: "var(--font-weight-medium)", marginBottom: "var(--space-4)" }}>
        Per-resident checks
      </h2>

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
        {data!.residents.map((r, index) => {
          const gaps = [!r.has_active_care_plan, !r.has_recent_interrai, !r.has_recent_notes].filter(Boolean).length;

          return (
            <motion.div
              key={r.resident_id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: "easeOut", delay: 0.15 + index * 0.05 }}
            >
              <Card style={{ borderColor: gaps > 0 ? "var(--color-coral)" : "var(--color-border)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-3)" }}>
                  <p style={{ fontSize: "var(--font-size-md)", fontWeight: "var(--font-weight-medium)" }}>{r.resident_name}</p>
                  <Badge variant={gaps > 0 ? "danger" : "success"}>
                    {gaps > 0 ? `${gaps} gap${gaps > 1 ? "s" : ""}` : "All clear"}
                  </Badge>
                </div>

                <CheckItem label="Active care plan" passed={r.has_active_care_plan} clause="Ngā Paerewa 2.3 — Care planning" />
                <CheckItem label="InterRAI assessment within 90 days" passed={r.has_recent_interrai} clause="Ngā Paerewa 2.4 — Assessment" />
                <div style={{ borderBottom: "none" }}>
                  <CheckItem label="Progress note within 30 days" passed={r.has_recent_notes} clause="Ngā Paerewa 2.5 — Ongoing review" />
                </div>

                <p style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", marginTop: "var(--space-3)" }}>
                  {r.active_medication_orders} active medication order{r.active_medication_orders !== 1 ? "s" : ""}
                </p>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}