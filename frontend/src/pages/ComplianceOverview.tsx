import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";

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
    <div style={{
      display: "flex",
      alignItems: "flex-start",
      gap: "10px",
      padding: "8px 0",
      borderBottom: "1px solid var(--color-border)",
    }}>
      <span style={{
        fontSize: "13px",
        fontWeight: 500,
        padding: "2px 8px",
        borderRadius: "999px",
        whiteSpace: "nowrap",
        backgroundColor: passed ? "var(--color-teal-light)" : "var(--color-coral-light)",
        color: passed ? "var(--color-sage-text)" : "var(--color-coral-text)",
      }}>
        {passed ? "✓ Met" : "✗ Gap"}
      </span>
      <div>
        <p style={{ fontSize: "13px", fontWeight: 500 }}>{label}</p>
        <p style={{ fontSize: "12px", color: "var(--color-text-muted)", marginTop: "2px" }}>
          {clause}
        </p>
      </div>
    </div>
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

  if (loading) return (
    <div style={{ padding: "40px" }}>
      <p style={{ fontSize: "14px", color: "var(--color-text-muted)" }}>Loading...</p>
    </div>
  );

  const totalChecks = data!.residents.length * 3;
  const passedChecks = data!.residents.reduce((acc, r) => {
    return acc
      + (r.has_active_care_plan ? 1 : 0)
      + (r.has_recent_interrai ? 1 : 0)
      + (r.has_recent_notes ? 1 : 0);
  }, 0);
  const complianceRate = totalChecks > 0
    ? Math.round((passedChecks / totalChecks) * 100)
    : 100;

  return (
    <div style={{ padding: "40px", maxWidth: "860px" }}>
      <h1 style={{ fontSize: "22px", fontWeight: 500, marginBottom: "4px" }}>
        Compliance overview
      </h1>
      <p style={{ fontSize: "14px", color: "var(--color-text-muted)", marginBottom: "32px" }}>
        Ngā Paerewa NZS 8134:2021 · Generated {data!.generated_on}
      </p>

      {/* Summary row */}
      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "32px" }}>
        <div style={{
          backgroundColor: "var(--color-surface)",
          border: `1px solid ${complianceRate === 100 ? "var(--color-teal)" : "var(--color-coral)"}`,
          borderRadius: "12px",
          padding: "20px 24px",
          flex: 1,
          minWidth: "160px",
        }}>
          <p style={{ fontSize: "13px", color: "var(--color-text-muted)", marginBottom: "8px" }}>
            Overall compliance
          </p>
          <p style={{
            fontSize: "28px",
            fontWeight: 500,
            color: complianceRate === 100 ? "var(--color-teal)" : "var(--color-coral-text)",
          }}>
            {complianceRate}%
          </p>
          <p style={{ fontSize: "12px", color: "var(--color-text-muted)", marginTop: "4px" }}>
            {passedChecks} of {totalChecks} checks passed
          </p>
        </div>

        <div style={{
          backgroundColor: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          borderRadius: "12px",
          padding: "20px 24px",
          flex: 1,
          minWidth: "160px",
        }}>
          <p style={{ fontSize: "13px", color: "var(--color-text-muted)", marginBottom: "8px" }}>
            Incidents (30 days)
          </p>
          <p style={{ fontSize: "28px", fontWeight: 500 }}>
            {data!.facility.incidents_last_30_days}
          </p>
          <p style={{ fontSize: "12px", color: "var(--color-text-muted)", marginTop: "4px" }}>
            {data!.facility.high_severity_last_30_days} high severity
          </p>
        </div>

        <div style={{
          backgroundColor: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          borderRadius: "12px",
          padding: "20px 24px",
          flex: 1,
          minWidth: "160px",
        }}>
          <p style={{ fontSize: "13px", color: "var(--color-text-muted)", marginBottom: "8px" }}>
            Active residents
          </p>
          <p style={{ fontSize: "28px", fontWeight: 500 }}>
            {data!.residents.length}
          </p>
          <p style={{ fontSize: "12px", color: "var(--color-text-muted)", marginTop: "4px" }}>
            under review
          </p>
        </div>
      </div>

      {/* Divider */}
      <div style={{ borderTop: "1px solid var(--color-border)", marginBottom: "32px" }} />

      {/* Per-resident checks */}
      <h2 style={{ fontSize: "15px", fontWeight: 500, marginBottom: "16px" }}>
        Per-resident checks
      </h2>

      {data!.residents.map((r) => {
        const gaps = [
          !r.has_active_care_plan,
          !r.has_recent_interrai,
          !r.has_recent_notes,
        ].filter(Boolean).length;

        return (
          <div
            key={r.resident_id}
            style={{
              backgroundColor: "var(--color-surface)",
              border: `1px solid ${gaps > 0 ? "var(--color-coral)" : "var(--color-border)"}`,
              borderRadius: "12px",
              padding: "20px",
              marginBottom: "16px",
            }}
          >
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "12px",
            }}>
              <p style={{ fontSize: "15px", fontWeight: 500 }}>{r.resident_name}</p>
              {gaps > 0 ? (
                <span style={{
                  fontSize: "12px",
                  padding: "2px 10px",
                  borderRadius: "999px",
                  backgroundColor: "var(--color-coral-light)",
                  color: "var(--color-coral-text)",
                  fontWeight: 500,
                }}>
                  {gaps} gap{gaps > 1 ? "s" : ""}
                </span>
              ) : (
                <span style={{
                  fontSize: "12px",
                  padding: "2px 10px",
                  borderRadius: "999px",
                  backgroundColor: "var(--color-teal-light)",
                  color: "var(--color-sage-text)",
                  fontWeight: 500,
                }}>
                  All clear
                </span>
              )}
            </div>

            <CheckItem
              label="Active care plan"
              passed={r.has_active_care_plan}
              clause="Ngā Paerewa 2.3 — Care planning"
            />
            <CheckItem
              label="InterRAI assessment within 90 days"
              passed={r.has_recent_interrai}
              clause="Ngā Paerewa 2.4 — Assessment"
            />
            <div style={{ borderBottom: "none" }}>
              <CheckItem
                label="Progress note within 30 days"
                passed={r.has_recent_notes}
                clause="Ngā Paerewa 2.5 — Ongoing review"
              />
            </div>

            <p style={{
              fontSize: "12px",
              color: "var(--color-text-muted)",
              marginTop: "12px",
            }}>
              {r.active_medication_orders} active medication order{r.active_medication_orders !== 1 ? "s" : ""}
            </p>
          </div>
        );
      })}
    </div>
  );
}