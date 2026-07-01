import { Link, Outlet, useLocation } from "react-router-dom";
import { useResident } from "../hooks/useResident";

export default function ResidentLayout() {
  const { resident, loading, id } = useResident();
  const location = useLocation();

  if (loading) return <div style={{ padding: "40px" }}>Loading...</div>;
  if (!resident) return <div style={{ padding: "40px" }}>Resident not found.</div>;

  const tabs = [
    { label: "Summary", path: `/residents/${id}` },
    { label: "Care plan", path: `/residents/${id}/care-plan` },
    { label: "Vitals", path: `/residents/${id}/vitals` },
    { label: "Notes", path: `/residents/${id}/notes` },
    { label: "Medications", path: `/residents/${id}/medications` },
    { label: "InterRAI", path: `/residents/${id}/interrai` },
    { label: "Incidents", path: `/residents/${id}/incidents` },
  ];

  return (
    <div style={{ padding: "40px", maxWidth: "760px" }}>
      <Link to="/" style={{ fontSize: "14px", color: "var(--color-teal)", textDecoration: "none" }}>
        ← Back to overview
      </Link>
      <h1 style={{ fontSize: "22px", fontWeight: 500, marginTop: "12px", marginBottom: "4px" }}>
        {resident.full_name}
      </h1>
      <p style={{ fontSize: "14px", color: "var(--color-text-muted)", marginBottom: "20px" }}>
        NHI {resident.nhi_number}
      </p>

      <div style={{ display: "flex", gap: "4px", borderBottom: "1px solid var(--color-border)", marginBottom: "24px" }}>
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.path;
          return (
            <Link
              key={tab.path}
              to={tab.path}
              style={{
                padding: "10px 16px",
                fontSize: "14px",
                textDecoration: "none",
                color: isActive ? "var(--color-teal)" : "var(--color-text-muted)",
                borderBottom: isActive ? "2px solid var(--color-teal)" : "2px solid transparent",
                fontWeight: isActive ? 500 : 400,
              }}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      <Outlet context={{ resident }} />
    </div>
  );
}