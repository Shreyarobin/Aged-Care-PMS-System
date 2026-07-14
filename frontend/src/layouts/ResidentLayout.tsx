import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, User, ClipboardList, Activity, FileText, Pill, Bot, ClipboardCheck, AlertTriangle } from "lucide-react";
import { useResident } from "../hooks/useResident";
import { Tabs, type TabItem } from "../components/ui/Tabs";
import { Badge } from "../components/ui/Badge";

export default function ResidentLayout() {
  const { resident, loading, id } = useResident();
  const location = useLocation();
  const navigate = useNavigate();

  if (loading) {
    return <div style={{ padding: "40px", color: "var(--color-text-muted)", fontSize: "var(--font-size-base)" }}>Loading...</div>;
  }
  if (!resident) {
    return <div style={{ padding: "40px", color: "var(--color-text-muted)", fontSize: "var(--font-size-base)" }}>Resident not found.</div>;
  }

  const tabDefs: { key: string; label: string; path: string; icon: TabItem["icon"] }[] = [
    { key: "summary", label: "Summary", path: `/residents/${id}`, icon: User },
    { key: "care-plan", label: "Care plan", path: `/residents/${id}/care-plan`, icon: ClipboardList },
    { key: "vitals", label: "Vitals", path: `/residents/${id}/vitals`, icon: Activity },
    { key: "notes", label: "Notes", path: `/residents/${id}/notes`, icon: FileText },
    { key: "medications", label: "Medications", path: `/residents/${id}/medications`, icon: Pill },
    { key: "careassist", label: "CareAssist", path: `/residents/${id}/careassist`, icon: Bot },
    { key: "interrai", label: "InterRAI", path: `/residents/${id}/interrai`, icon: ClipboardCheck },
    { key: "incidents", label: "Incidents", path: `/residents/${id}/incidents`, icon: AlertTriangle },
  ];

  const activeTab = tabDefs.find((tab) => tab.path === location.pathname)?.key ?? "summary";

  const tabItems: TabItem[] = tabDefs.map((tab) => ({
    key: tab.key,
    label: tab.label,
    icon: tab.icon,
    onClick: () => navigate(tab.path),
  }));

  return (
    <div style={{ padding: "var(--space-10)", maxWidth: "820px" }}>
      <div
        onClick={() => navigate("/")}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          fontSize: "var(--font-size-sm)",
          color: "var(--color-teal)",
          cursor: "pointer",
        }}
      >
        <ArrowLeft size={14} />
        Back to overview
      </div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        style={{ marginTop: "var(--space-3)", marginBottom: "var(--space-5)" }}
      >
        <h1 style={{ fontSize: "var(--font-size-xl)", fontWeight: "var(--font-weight-semibold)", marginBottom: "var(--space-2)" }}>
          {resident.full_name}
        </h1>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
          <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)" }}>
            NHI {resident.nhi_number}
          </span>
          <Badge variant="neutral" size="sm">{resident.funding_category}</Badge>
          {resident.discharge_date && <Badge variant="neutral" size="sm">Discharged</Badge>}
        </div>
      </motion.div>

      <div style={{ marginBottom: "var(--space-6)" }}>
        <Tabs items={tabItems} activeKey={activeTab} layoutGroupId="resident-tabs-underline" />
      </div>

      <Outlet context={{ resident }} />
    </div>
  );
}