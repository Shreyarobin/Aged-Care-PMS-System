import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { useAuth } from "../context/AuthContext";

type VitalsReading = {
  id: number;
  heart_rate: number;
  blood_pressure_systolic: number;
  blood_pressure_diastolic: number;
  spo2: number;
  temperature: number;
  respiratory_rate: number | null;
  recorded_at: string;
};

type ContributingFactor = { factor: string; value: number };

type RiskScore = {
  resident_id: number;
  risk_probability: number | null;
  risk_level: "low" | "medium" | "high" | "unknown";
  frailty_adjusted?: boolean;
  contributing_factors?: ContributingFactor[];
  trend?: string | null;
  readings_used: number;
  last_assessed?: string;
  model_version?: string;
  message?: string;
};

type ResidentContext = { resident: { id: number } };

const RISK_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  low: { bg: "var(--color-teal-light)", text: "var(--color-sage-text)", border: "var(--color-teal)" },
  medium: { bg: "var(--color-amber-light)", text: "var(--color-amber-text)", border: "var(--color-amber)" },
  high: { bg: "var(--color-coral-light)", text: "var(--color-coral-text)", border: "var(--color-coral)" },
};

const FACTOR_LABELS: Record<string, string> = {
  hr_mean: "Heart rate (average)",
  hr_std: "Heart rate (variability)",
  hr_max: "Heart rate (max)",
  hr_min: "Heart rate (min)",
  hr_trend: "Heart rate (trend)",
  sbp_mean: "Systolic BP (average)",
  sbp_std: "Systolic BP (variability)",
  sbp_min: "Systolic BP (min)",
  dbp_mean: "Diastolic BP (average)",
  dbp_std: "Diastolic BP (variability)",
  spo2_mean: "SpO2 (average)",
  spo2_min: "SpO2 (min)",
  spo2_trend: "SpO2 (trend)",
  temp_mean: "Temperature (average)",
  temp_max: "Temperature (max)",
  temp_trend: "Temperature (trend)",
  resp_mean: "Respiratory rate (average)",
  resp_std: "Respiratory rate (variability)",
  resp_max: "Respiratory rate (max)",
  resp_min: "Respiratory rate (min)",
  resp_trend: "Respiratory rate (trend)",
  hours_of_data: "Data completeness",
};

function RiskScoreCard({ risk }: { risk: RiskScore }) {
  const colors = RISK_COLORS[risk.risk_level] ?? RISK_COLORS.low;

  return (
    <div
      style={{
        backgroundColor: colors.bg,
        border: `1px solid ${colors.border}`,
        borderRadius: "12px",
        padding: "20px",
        marginBottom: "16px",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: "12px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", color: colors.text }}>
            {risk.risk_level} risk
            {risk.trend && risk.trend !== "stable" ? ` · ${risk.trend}` : ""}
          </div>
          <div style={{ fontSize: "28px", fontWeight: 600, color: colors.text, marginTop: "4px" }}>
            {risk.risk_probability !== null ? `${Math.round(risk.risk_probability * 100)}%` : "—"}
          </div>
          <div style={{ fontSize: "12px", color: "var(--color-text-muted)", marginTop: "4px" }}>
            Deterioration risk score · based on last {risk.readings_used} readings
            {risk.last_assessed && ` · updated ${new Date(risk.last_assessed).toLocaleTimeString()}`}
          </div>
        </div>
      </div>

      {risk.contributing_factors && risk.contributing_factors.length > 0 && (
        <div style={{ marginTop: "14px", display: "flex", flexWrap: "wrap", gap: "8px" }}>
          {risk.contributing_factors.map((f) => (
            <span
              key={f.factor}
              style={{
                fontSize: "12px",
                padding: "4px 10px",
                borderRadius: "999px",
                backgroundColor: "var(--color-surface)",
                border: `1px solid ${colors.border}`,
                color: colors.text,
              }}
            >
              {FACTOR_LABELS[f.factor] ?? f.factor}: {f.value}
            </span>
          ))}
        </div>
      )}

      <div style={{ fontSize: "11px", color: "var(--color-text-muted)", marginTop: "10px" }}>
        AI-generated estimate from vitals trends — not a diagnosis. Always use clinical judgement.
      </div>
    </div>
  );
}

export default function VitalsTab() {
  const { resident } = useOutletContext<ResidentContext>();
  const { token } = useAuth();
  const [readings, setReadings] = useState<VitalsReading[]>([]);
  const [riskScore, setRiskScore] = useState<RiskScore | null>(null);

  useEffect(() => {
    function fetchVitals() {
      fetch(`http://127.0.0.1:8000/residents/${resident.id}/vitals`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => (res.ok ? res.json() : []))
        .then((data) => setReadings(data));
    }

    fetchVitals();
    const interval = setInterval(fetchVitals, 5000);
    return () => clearInterval(interval);
  }, [resident.id, token]);

  useEffect(() => {
    function fetchRiskScore() {
      fetch(`http://127.0.0.1:8000/residents/${resident.id}/risk-score`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => setRiskScore(data))
        .catch(() => {
          // Risk score is supplementary — a failed fetch shouldn't block the
          // vitals tab itself from working, so we just skip silently.
        });
    }

    fetchRiskScore();
    const interval = setInterval(fetchRiskScore, 60000);
    return () => clearInterval(interval);
  }, [resident.id, token]);

  if (readings.length === 0) {
    return <p style={{ fontSize: "14px", color: "var(--color-text-muted)" }}>No vitals recorded yet.</p>;
  }

  return (
    <div>
      {riskScore && riskScore.risk_level !== "unknown" && <RiskScoreCard risk={riskScore} />}
      <div style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "12px", padding: "20px" }}>
        <div style={{ height: "200px", marginBottom: "16px" }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={[...readings].reverse()}>
              <XAxis
                dataKey="recorded_at"
                tickFormatter={(value) => new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                fontSize={11}
                stroke="var(--color-text-muted)"
              />
              <YAxis fontSize={11} stroke="var(--color-text-muted)" domain={["auto", "auto"]} />
              <Tooltip
                labelFormatter={(value) => new Date(value).toLocaleTimeString()}
                formatter={(value: number, name: string) => [value, name === "heart_rate" ? "Heart rate" : "SpO2"]}
              />
              <Line type="monotone" dataKey="heart_rate" stroke="#0f6e56" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="spo2" stroke="#d85a30" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {readings.slice(0, 10).map((reading) => (
            <div key={reading.id} style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", borderTop: "1px solid var(--color-border)", paddingTop: "8px" }}>
              <span style={{ color: "var(--color-text-muted)" }}>{new Date(reading.recorded_at).toLocaleTimeString()}</span>
              <span>HR {reading.heart_rate} · BP {reading.blood_pressure_systolic}/{reading.blood_pressure_diastolic} · SpO2 {reading.spo2}% · Resp {reading.respiratory_rate ?? "—"} · {reading.temperature}°C</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}