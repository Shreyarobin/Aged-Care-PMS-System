import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { Card } from "../components/ui/Card";
import { Badge, type BadgeVariant } from "../components/ui/Badge";
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from "../components/ui/Table";

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

const RISK_BORDER_COLOR: Record<string, string> = {
  low: "var(--color-teal)",
  medium: "var(--color-amber)",
  high: "var(--color-coral)",
};

const RISK_BADGE_VARIANT: Record<string, BadgeVariant> = {
  low: "success",
  medium: "warning",
  high: "danger",
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
  const borderColor = RISK_BORDER_COLOR[risk.risk_level] ?? RISK_BORDER_COLOR.low;
  const badgeVariant = RISK_BADGE_VARIANT[risk.risk_level] ?? "success";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      style={{ marginBottom: "var(--space-4)" }}
    >
      <Card style={{ borderColor }}>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: "var(--space-2)" }}>
          <Badge variant={badgeVariant}>
            {risk.risk_level} risk{risk.trend && risk.trend !== "stable" ? ` · ${risk.trend}` : ""}
          </Badge>
        </div>
        <div style={{ fontSize: "var(--font-size-2xl)", fontWeight: "var(--font-weight-semibold)" }}>
          {risk.risk_probability !== null ? `${Math.round(risk.risk_probability * 100)}%` : "—"}
        </div>
        <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", marginTop: "var(--space-1)" }}>
          Deterioration risk score · based on last {risk.readings_used} readings
          {risk.last_assessed && ` · updated ${new Date(risk.last_assessed).toLocaleTimeString()}`}
        </div>

        {risk.contributing_factors && risk.contributing_factors.length > 0 && (
          <div style={{ marginTop: "var(--space-4)", display: "flex", flexWrap: "wrap", gap: "var(--space-2)" }}>
            {risk.contributing_factors.map((f) => (
              <Badge key={f.factor} variant="neutral" size="sm">
                {FACTOR_LABELS[f.factor] ?? f.factor}: {f.value}
              </Badge>
            ))}
          </div>
        )}

        <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", marginTop: "var(--space-3)" }}>
          AI-generated estimate from vitals trends — not a diagnosis. Always use clinical judgement.
        </div>
      </Card>
    </motion.div>
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
    return <p style={{ fontSize: "var(--font-size-base)", color: "var(--color-text-muted)" }}>No vitals recorded yet.</p>;
  }

  return (
    <div>
      {riskScore && riskScore.risk_level !== "unknown" && <RiskScoreCard risk={riskScore} />}

      <Card padding="md" style={{ marginBottom: "var(--space-4)" }}>
        <div style={{ height: "200px" }}>
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
                formatter={(value, name) => [value, name === "heart_rate" ? "Heart rate" : "SpO2"]}
              />
              <Line type="monotone" dataKey="heart_rate" stroke="#0f6e56" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="spo2" stroke="#d85a30" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Table>
        <TableHead>
          <TableRow>
            <TableHeaderCell>Time</TableHeaderCell>
            <TableHeaderCell>HR</TableHeaderCell>
            <TableHeaderCell>BP</TableHeaderCell>
            <TableHeaderCell>SpO2</TableHeaderCell>
            <TableHeaderCell>Resp</TableHeaderCell>
            <TableHeaderCell>Temp</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {readings.slice(0, 10).map((reading) => (
            <TableRow key={reading.id}>
              <TableCell style={{ color: "var(--color-text-muted)" }}>
                {new Date(reading.recorded_at).toLocaleTimeString()}
              </TableCell>
              <TableCell>{reading.heart_rate}</TableCell>
              <TableCell>
                {reading.blood_pressure_systolic}/{reading.blood_pressure_diastolic}
              </TableCell>
              <TableCell>{reading.spo2}%</TableCell>
              <TableCell>{reading.respiratory_rate ?? "—"}</TableCell>
              <TableCell>{reading.temperature}°C</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}