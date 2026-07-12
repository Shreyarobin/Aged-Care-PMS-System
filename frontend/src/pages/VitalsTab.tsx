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

type ResidentContext = { resident: { id: number } };

export default function VitalsTab() {
  const { resident } = useOutletContext<ResidentContext>();
  const { token } = useAuth();
  const [readings, setReadings] = useState<VitalsReading[]>([]);

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

  if (readings.length === 0) {
    return <p style={{ fontSize: "14px", color: "var(--color-text-muted)" }}>No vitals recorded yet.</p>;
  }

  return (
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
  );
}