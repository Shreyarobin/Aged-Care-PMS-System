import { useEffect, useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { CalendarPlus } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Alert } from "../components/ui/Alert";
import { Badge, type BadgeVariant } from "../components/ui/Badge";
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from "../components/ui/Table";
import { useToast } from "../components/ui/Toast";

type StaffUser = {
  id: number;
  full_name: string;
  role: string;
};

type StaffShift = {
  id: number;
  shift_date: string;
  shift_type: string;
  ward: string;
  staff_name: string;
  staff_id: number;
};

const SHIFT_LABELS: Record<string, string> = { morning: "Morning", afternoon: "Afternoon", night: "Night" };
const SHIFT_BADGE_VARIANT: Record<string, BadgeVariant> = { morning: "success", afternoon: "warning", night: "danger" };
const SHIFT_ACCENT_COLOR: Record<string, string> = {
  morning: "var(--color-teal)",
  afternoon: "var(--color-amber)",
  night: "var(--color-coral)",
};

export default function StaffRoster() {
  const { token } = useAuth();
  const showToast = useToast();
  const [shifts, setShifts] = useState<StaffShift[]>([]);
  const [staffUsers, setStaffUsers] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    staff_id: "",
    shift_date: new Date().toISOString().split("T")[0],
    shift_type: "morning",
    ward: "",
  });

  function fetchShifts() {
    fetch("http://127.0.0.1:8000/staff-shifts", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        setShifts(data);
        setLoading(false);
      });
  }

  useEffect(() => {
    Promise.all([
      fetch("http://127.0.0.1:8000/staff-shifts", {
        headers: { Authorization: `Bearer ${token}` },
      }).then((res) => res.json()),
      fetch("http://127.0.0.1:8000/staff-users", {
        headers: { Authorization: `Bearer ${token}` },
      }).then((res) => res.json()),
    ]).then(([shiftsData, usersData]) => {
      setShifts(shiftsData);
      setStaffUsers(usersData);
      setLoading(false);
    });
  }, [token]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const response = await fetch("http://127.0.0.1:8000/staff-shifts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          staff_id: parseInt(form.staff_id),
          shift_date: form.shift_date,
          shift_type: form.shift_type,
          ward: form.ward,
        }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || "Failed to create shift");
      }
      setForm({
        staff_id: "",
        shift_date: new Date().toISOString().split("T")[0],
        shift_type: "morning",
        ward: "",
      });
      setShowForm(false);
      setLoading(true);
      showToast("Shift added", "success");
      fetchShifts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  const selectStyle: React.CSSProperties = {
    display: "block",
    width: "100%",
    padding: "10px 12px",
    border: "1.5px solid var(--color-border)",
    borderRadius: "var(--radius-md)",
    fontSize: "var(--font-size-base)",
    background: "var(--color-surface)",
    fontFamily: "inherit",
    color: "var(--color-text)",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: "var(--font-size-sm)",
    fontWeight: "var(--font-weight-medium)",
    color: "var(--color-text)",
    display: "block",
    marginBottom: "6px",
  };

  if (loading) {
    return (
      <div style={{ padding: "var(--space-10)" }}>
        <p style={{ fontSize: "var(--font-size-base)", color: "var(--color-text-muted)" }}>Loading...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "var(--space-10)", maxWidth: "860px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "var(--space-6)" }}>
        <div>
          <h1 style={{ fontSize: "var(--font-size-xl)", fontWeight: "var(--font-weight-semibold)", marginBottom: "var(--space-1)" }}>
            Staff roster
          </h1>
          <p style={{ fontSize: "var(--font-size-base)", color: "var(--color-text-muted)" }}>Manage shift assignments</p>
        </div>
        <Button variant={showForm ? "secondary" : "primary"} size="sm" onClick={() => setShowForm(!showForm)}>
          {!showForm && <CalendarPlus size={15} />}
          {showForm ? "Cancel" : "Add shift"}
        </Button>
      </div>

      {showForm && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          style={{ marginBottom: "var(--space-6)" }}
        >
          <Card>
            <h2 style={{ fontSize: "var(--font-size-md)", fontWeight: "var(--font-weight-semibold)", marginBottom: "var(--space-4)" }}>
              Add shift
            </h2>
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: "var(--space-4)" }}>
                <label style={labelStyle}>Staff member *</label>
                <select
                  value={form.staff_id}
                  onChange={(e) => setForm({ ...form, staff_id: e.target.value })}
                  required
                  style={selectStyle}
                >
                  <option value="">Select staff member...</option>
                  {staffUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.full_name} — {u.role}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: "var(--space-4)" }}>
                <Input
                  label="Shift date *"
                  type="date"
                  value={form.shift_date}
                  onChange={(e) => setForm({ ...form, shift_date: e.target.value })}
                  required
                />
              </div>

              <div style={{ marginBottom: "var(--space-4)" }}>
                <label style={labelStyle}>Shift type *</label>
                <div style={{ display: "flex", gap: "var(--space-2)" }}>
                  {(["morning", "afternoon", "night"] as const).map((type) => {
                    const selected = form.shift_type === type;
                    const accent = SHIFT_ACCENT_COLOR[type];
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setForm({ ...form, shift_type: type })}
                        style={{
                          padding: "7px 18px",
                          borderRadius: "var(--radius-md)",
                          fontSize: "var(--font-size-sm)",
                          fontWeight: "var(--font-weight-medium)",
                          border: `1.5px solid ${selected ? accent : "var(--color-border)"}`,
                          cursor: "pointer",
                          backgroundColor: selected ? accent : "var(--color-surface)",
                          color: selected ? "#ffffff" : "var(--color-text)",
                          fontFamily: "inherit",
                          transition: "background-color var(--duration-fast) var(--ease-standard), border-color var(--duration-fast) var(--ease-standard)",
                        }}
                      >
                        {SHIFT_LABELS[type]}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ marginBottom: "var(--space-4)" }}>
                <Input
                  label="Ward *"
                  type="text"
                  value={form.ward}
                  onChange={(e) => setForm({ ...form, ward: e.target.value })}
                  required
                  placeholder="e.g. Ward A"
                />
              </div>

              {error && (
                <div style={{ marginBottom: "var(--space-4)" }}>
                  <Alert variant="danger">{error}</Alert>
                </div>
              )}

              <Button type="submit" loading={saving}>
                {saving ? "Saving..." : "Save shift"}
              </Button>
            </form>
          </Card>
        </motion.div>
      )}

      {shifts.length === 0 && !showForm && (
        <Card padding="lg" style={{ textAlign: "center" }}>
          <p style={{ fontSize: "var(--font-size-base)", color: "var(--color-text-muted)", marginBottom: "var(--space-4)" }}>
            No shifts scheduled.
          </p>
          <Button onClick={() => setShowForm(true)}>
            <CalendarPlus size={15} />
            Add shift
          </Button>
        </Card>
      )}

      {shifts.length > 0 && (
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Staff member</TableHeaderCell>
              <TableHeaderCell>Ward / date</TableHeaderCell>
              <TableHeaderCell>Shift</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {shifts.map((shift) => (
              <TableRow key={shift.id}>
                <TableCell style={{ fontWeight: "var(--font-weight-medium)" }}>{shift.staff_name}</TableCell>
                <TableCell style={{ color: "var(--color-text-muted)" }}>
                  {shift.ward} · {shift.shift_date}
                </TableCell>
                <TableCell>
                  <Badge variant={SHIFT_BADGE_VARIANT[shift.shift_type]} size="sm">
                    {SHIFT_LABELS[shift.shift_type]}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}