import { useState, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

type Resident = {
  id: number;
  full_name: string;
  nhi_number: string;
  funding_category: string;
  admission_date: string;
  discharge_date: string | null;
};

type CarePlan = {
  id: number;
  goals: string;
  interventions: string;
  review_notes: string | null;
  created_date: string;
};

type InterRAIAssessment = {
  id: number;
  cognitive_performance: number;
  adl_hierarchy: number;
  mood: number;
  falls_risk: number;
  continence: number;
  communication: number;
  frailty_index: number;
  assessment_date: string;
};

type ProgressNote = {
  id: number;
  category: string;
  content: string;
  written_at: string;
};

type MedicationOrder = {
  id: number;
  medication_name: string;
  dosage: string;
  scheduled_times: string;
  is_active: boolean;
};

type VitalsReading = {
  id: number;
  heart_rate: number;
  blood_pressure_systolic: number;
  blood_pressure_diastolic: number;
  spo2: number;
  temperature: number;
  recorded_at: string;
};

function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem("token"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [residents, setResidents] = useState<Resident[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [activeCarePlan, setActiveCarePlan] = useState<CarePlan | null>(null);
  const [latestAssessment, setLatestAssessment] = useState<InterRAIAssessment | null>(null);
  const [progressNotes, setProgressNotes] = useState<ProgressNote[]>([]);
  const [noteContent, setNoteContent] = useState("");
  const [noteCategory, setNoteCategory] = useState("general");
  const [savingNote, setSavingNote] = useState(false);
  const [medicationOrders, setMedicationOrders] = useState<MedicationOrder[]>([]);
  const [vitalsReadings, setVitalsReadings] = useState<VitalsReading[]>([]);

  useEffect(() => {
    if (!token) return;

    fetch("http://127.0.0.1:8000/residents", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) {
          localStorage.removeItem("token");
          setToken(null);
          throw new Error("Session expired");
        }
        return res.json();
      })
      .then((data) => setResidents(data))
      .catch(() => setError("Could not load residents"));
  }, [token]);

  useEffect(() => {
    if (!token || selectedId === null) {
      setActiveCarePlan(null);
      setLatestAssessment(null);
      setProgressNotes([]);
      setMedicationOrders([]);
      return;
    }

    fetch(`http://127.0.0.1:8000/residents/${selectedId}/care-plans/active`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setActiveCarePlan(data));

    fetch(`http://127.0.0.1:8000/residents/${selectedId}/interrai/latest`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setLatestAssessment(data));

    fetch(`http://127.0.0.1:8000/residents/${selectedId}/progress-notes`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setProgressNotes(data));

    fetch(`http://127.0.0.1:8000/residents/${selectedId}/medication-orders`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setMedicationOrders(data));
  }, [token, selectedId]);

  useEffect(() => {
    if (!token || selectedId === null) {
      setVitalsReadings([]);
      return;
    }

    function fetchVitals() {
      fetch(`http://127.0.0.1:8000/residents/${selectedId}/vitals`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => (res.ok ? res.json() : []))
        .then((data) => setVitalsReadings(data));
    }

    fetchVitals();
    const interval = setInterval(fetchVitals, 5000);

    return () => clearInterval(interval);
  }, [token, selectedId]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("http://127.0.0.1:8000/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || "Login failed");
      }

      const data = await response.json();
      localStorage.setItem("token", data.access_token);
      setToken(data.access_token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleAddNote() {
    if (!noteContent.trim() || selectedId === null) return;
    setSavingNote(true);
    try {
      const response = await fetch(`http://127.0.0.1:8000/residents/${selectedId}/progress-notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ category: noteCategory, content: noteContent }),
      });
      const newNote = await response.json();
      setProgressNotes([newNote, ...progressNotes]);
      setNoteContent("");
    } finally {
      setSavingNote(false);
    }
  }

  if (!token) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
        <form onSubmit={handleLogin} style={{ width: "320px" }}>
          <h1 style={{ fontSize: "22px", fontWeight: 500, marginBottom: "24px" }}>Sign in</h1>
          <label style={{ fontSize: "13px", color: "var(--color-text-muted)" }}>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ display: "block", width: "100%", padding: "10px 12px", marginTop: "4px", marginBottom: "16px", border: "1px solid var(--color-border)", borderRadius: "8px", fontSize: "14px" }}
          />
          <label style={{ fontSize: "13px", color: "var(--color-text-muted)" }}>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ display: "block", width: "100%", padding: "10px 12px", marginTop: "4px", marginBottom: "20px", border: "1px solid var(--color-border)", borderRadius: "8px", fontSize: "14px" }}
          />
          {error && <p style={{ color: "var(--color-coral-text)", fontSize: "13px", marginBottom: "16px" }}>{error}</p>}
          <button type="submit" disabled={loading} style={{ width: "100%", padding: "12px", backgroundColor: "var(--color-teal)", color: "white", border: "none", borderRadius: "8px", fontSize: "14px", fontWeight: 500 }}>
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    );
  }

  const selectedResident = residents.find((r) => r.id === selectedId);

  if (selectedResident) {
    return (
      <div style={{ padding: "40px", maxWidth: "720px", margin: "0 auto" }}>
        <button
          onClick={() => setSelectedId(null)}
          style={{ background: "none", border: "none", color: "var(--color-teal)", fontSize: "14px", marginBottom: "20px", padding: 0 }}
        >
          ← Back to overview
        </button>
        <h1 style={{ fontSize: "22px", fontWeight: 500, marginBottom: "4px" }}>{selectedResident.full_name}</h1>
        <p style={{ fontSize: "14px", color: "var(--color-text-muted)", marginBottom: "24px" }}>
          NHI {selectedResident.nhi_number}
        </p>
        <div style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "12px", padding: "20px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", rowGap: "12px", fontSize: "14px" }}>
            <span style={{ color: "var(--color-text-muted)" }}>Funding</span>
            <span>{selectedResident.funding_category}</span>
            <span style={{ color: "var(--color-text-muted)" }}>Admitted</span>
            <span>{selectedResident.admission_date}</span>
            <span style={{ color: "var(--color-text-muted)" }}>Status</span>
            <span>{selectedResident.discharge_date ? `Discharged ${selectedResident.discharge_date}` : "Active"}</span>
          </div>
        </div>

        {activeCarePlan && (
          <div style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "12px", padding: "20px", marginTop: "16px" }}>
            <h2 style={{ fontSize: "16px", fontWeight: 500, marginBottom: "12px" }}>Active care plan</h2>
            <p style={{ fontSize: "13px", color: "var(--color-text-muted)", marginBottom: "4px" }}>Goals</p>
            <p style={{ fontSize: "14px", marginBottom: "12px" }}>{activeCarePlan.goals}</p>
            <p style={{ fontSize: "13px", color: "var(--color-text-muted)", marginBottom: "4px" }}>Interventions</p>
            <p style={{ fontSize: "14px" }}>{activeCarePlan.interventions}</p>
          </div>
        )}

        {latestAssessment && (
          <div style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "12px", padding: "20px", marginTop: "16px" }}>
            <h2 style={{ fontSize: "16px", fontWeight: 500, marginBottom: "12px" }}>Latest InterRAI assessment</h2>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
              <div style={{
                width: "48px", height: "48px", borderRadius: "50%",
                backgroundColor: latestAssessment.frailty_index > 0.5 ? "var(--color-coral-light)" : "var(--color-sage)",
                color: latestAssessment.frailty_index > 0.5 ? "var(--color-coral-text)" : "var(--color-sage-text)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "13px", fontWeight: 500,
              }}>
                {Math.round(latestAssessment.frailty_index * 100)}%
              </div>
              <span style={{ fontSize: "13px", color: "var(--color-text-muted)" }}>Frailty index, assessed {latestAssessment.assessment_date}</span>
            </div>
          </div>
        )}

        <div style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "12px", padding: "20px", marginTop: "16px" }}>
          <h2 style={{ fontSize: "16px", fontWeight: 500, marginBottom: "12px" }}>Add a progress note</h2>
          <select
            value={noteCategory}
            onChange={(e) => setNoteCategory(e.target.value)}
            style={{ display: "block", marginBottom: "8px", padding: "8px", borderRadius: "8px", border: "1px solid var(--color-border)", fontSize: "13px" }}
          >
            <option value="general">General</option>
            <option value="incident">Incident</option>
            <option value="family_contact">Family contact</option>
            <option value="medical">Medical</option>
          </select>
          <textarea
            value={noteContent}
            onChange={(e) => setNoteContent(e.target.value)}
            placeholder="Write an observation..."
            style={{ display: "block", width: "100%", minHeight: "70px", padding: "10px", borderRadius: "8px", border: "1px solid var(--color-border)", fontSize: "14px", marginBottom: "8px", fontFamily: "inherit" }}
          />
          <button
            onClick={handleAddNote}
            disabled={savingNote || !noteContent.trim()}
            style={{ padding: "8px 16px", backgroundColor: "var(--color-teal)", color: "white", border: "none", borderRadius: "8px", fontSize: "13px", fontWeight: 500 }}
          >
            {savingNote ? "Saving..." : "Save note"}
          </button>

          <div style={{ marginTop: "20px", display: "flex", flexDirection: "column", gap: "10px" }}>
            {progressNotes.map((note) => (
              <div key={note.id} style={{ borderTop: "1px solid var(--color-border)", paddingTop: "10px" }}>
                <p style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>
                  {note.category} · {new Date(note.written_at).toLocaleString()}
                </p>
                <p style={{ fontSize: "14px", marginTop: "2px" }}>{note.content}</p>
              </div>
            ))}
          </div>
        </div>

        <div style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "12px", padding: "20px", marginTop: "16px" }}>
          <h2 style={{ fontSize: "16px", fontWeight: 500, marginBottom: "12px" }}>Medications</h2>
          {medicationOrders.length === 0 && (
            <p style={{ fontSize: "13px", color: "var(--color-text-muted)" }}>No medications on record.</p>
          )}
          {medicationOrders.map((order) => (
            <div key={order.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid var(--color-border)" }}>
              <div>
                <p style={{ fontSize: "14px", fontWeight: 500 }}>{order.medication_name} · {order.dosage}</p>
                <p style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>{order.scheduled_times}</p>
              </div>
              <span style={{
                fontSize: "11px", padding: "2px 8px", borderRadius: "999px",
                backgroundColor: order.is_active ? "var(--color-sage)" : "var(--color-border)",
                color: order.is_active ? "var(--color-sage-text)" : "var(--color-text-muted)",
              }}>
                {order.is_active ? "Active" : "Discontinued"}
              </span>
            </div>
          ))}
        </div>

        <div style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "12px", padding: "20px", marginTop: "16px" }}>
          <h2 style={{ fontSize: "16px", fontWeight: 500, marginBottom: "12px" }}>Vitals</h2>
          {vitalsReadings.length === 0 ? (
            <p style={{ fontSize: "13px", color: "var(--color-text-muted)" }}>No vitals recorded yet.</p>
          ) : (
            <>
              <div style={{ height: "180px", marginBottom: "16px" }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={[...vitalsReadings].reverse()}>
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
                {vitalsReadings.slice(0, 10).map((reading) => (
                  <div key={reading.id} style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", borderTop: "1px solid var(--color-border)", paddingTop: "8px" }}>
                    <span style={{ color: "var(--color-text-muted)" }}>{new Date(reading.recorded_at).toLocaleTimeString()}</span>
                    <span>HR {reading.heart_rate} · BP {reading.blood_pressure_systolic}/{reading.blood_pressure_diastolic} · SpO2 {reading.spo2}% · {reading.temperature}°C</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "40px", maxWidth: "720px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "22px", fontWeight: 500, marginBottom: "24px" }}>Resident overview</h1>
      {error && <p style={{ color: "var(--color-coral-text)" }}>{error}</p>}
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {residents.map((resident, index) => (
          <div
            key={resident.id}
            onClick={() => setSelectedId(resident.id)}
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

export default App;