import { useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Users, MessageSquare, LayoutDashboard, CalendarDays, ShieldCheck, LogOut, HeartPulse, Menu, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";

type NavItemDef = { label: string; path: string; icon: React.ComponentType<{ size?: number }> };

const MAIN_NAV_ITEMS: NavItemDef[] = [
  { label: "Resident overview", path: "/", icon: Users },
  { label: "Messages", path: "/messages", icon: MessageSquare },
];

const MANAGEMENT_NAV_ITEMS: NavItemDef[] = [
  { label: "Manager dashboard", path: "/manager", icon: LayoutDashboard },
  { label: "Staff roster", path: "/roster", icon: CalendarDays },
  { label: "Compliance", path: "/compliance", icon: ShieldCheck },
];

// The page-transition fade should trigger for genuine section changes
// (overview -> manager dashboard, or switching to a different resident
// entirely) but NOT on every click between tabs within the SAME resident
// (Vitals -> Notes -> Medications), since Tabs' own sliding underline
// already provides that feedback — a full fade on every tab click would
// feel sluggish rather than premium. Grouping all of one resident's tabs
// under a single stable key achieves this.
function getPageTransitionKey(pathname: string): string {
  const residentMatch = pathname.match(/^\/residents\/(\d+)/);
  if (residentMatch) return `resident-${residentMatch[1]}`;
  return pathname;
}

export default function StaffLayout() {
  const { logout, role } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Close the mobile nav automatically on route change — a user picking a
  // page expects the menu to close, not to have to dismiss it separately.
  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  // Escape closes the mobile nav, same pattern Modal already uses.
  useEffect(() => {
    if (!mobileNavOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setMobileNavOpen(false);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileNavOpen]);

  function handleLogout() {
    logout();
    navigate("/login");
  }

  function isActive(path: string) {
    if (path === "/") {
      return location.pathname === "/" || location.pathname.startsWith("/residents");
    }
    return location.pathname.startsWith(path);
  }

  function NavLink({ item }: { item: NavItemDef }) {
    const active = isActive(item.path);
    const Icon = item.icon;
    return (
      <button
        onClick={() => {
          setMobileNavOpen(false);
          navigate(item.path);
        }}
        aria-current={active ? "page" : undefined}
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          width: "100%",
          padding: "10px 16px",
          fontSize: "var(--font-size-base)",
          color: active ? "var(--color-teal)" : "var(--color-text)",
          fontWeight: active ? "var(--font-weight-medium)" : "var(--font-weight-normal)",
          cursor: "pointer",
          borderRadius: "var(--radius-md)",
          background: "none",
          border: "none",
          textAlign: "left",
          fontFamily: "inherit",
        }}
      >
        {active && (
          <motion.div
            layoutId="sidebar-active-bg"
            transition={{ duration: 0.2, ease: "easeOut" }}
            style={{
              position: "absolute",
              inset: 0,
              backgroundColor: "var(--color-teal-light)",
              borderRadius: "var(--radius-md)",
              zIndex: 0,
            }}
          />
        )}
        <span style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "center", gap: "10px" }}>
          <Icon size={17} />
          {item.label}
        </span>
      </button>
    );
  }

  const sidebarContent = (
    <>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          padding: "0 var(--space-2)",
          marginBottom: "var(--space-6)",
        }}
      >
        <div
          style={{
            width: "28px",
            height: "28px",
            borderRadius: "var(--radius-sm)",
            backgroundColor: "var(--color-teal)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#ffffff",
            flexShrink: 0,
          }}
        >
          <HeartPulse size={16} />
        </div>
        <span style={{ fontSize: "var(--font-size-md)", fontWeight: "var(--font-weight-semibold)" }}>
          CareStack
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
        {MAIN_NAV_ITEMS.map((item) => (
          <NavLink key={item.path} item={item} />
        ))}
      </div>

      {role === "manager" && (
        <>
          <p
            style={{
              fontSize: "var(--font-size-xs)",
              fontWeight: "var(--font-weight-medium)",
              color: "var(--color-text-muted)",
              padding: "var(--space-4) var(--space-4) var(--space-1)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            Management
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
            {MANAGEMENT_NAV_ITEMS.map((item) => (
              <NavLink key={item.path} item={item} />
            ))}
          </div>
        </>
      )}

      <div style={{ marginTop: "auto" }}>
        <button
          onClick={handleLogout}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            textAlign: "left",
            padding: "10px 16px",
            fontSize: "var(--font-size-base)",
            background: "none",
            border: "none",
            color: "var(--color-text-muted)",
            cursor: "pointer",
            borderRadius: "var(--radius-md)",
            fontFamily: "inherit",
          }}
        >
          <LogOut size={17} />
          Sign out
        </button>
      </div>
    </>
  );

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <div
        className={`staff-sidebar-backdrop${mobileNavOpen ? " open" : ""}`}
        onClick={() => setMobileNavOpen(false)}
        aria-hidden="true"
      />

      <nav
        className={`staff-sidebar${mobileNavOpen ? " open" : ""}`}
        aria-label="Main navigation"
        style={{
          width: "232px",
          borderRight: "1px solid var(--color-border)",
          padding: "var(--space-6) var(--space-3)",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "var(--color-surface)",
        }}
      >
        {sidebarContent}
      </nav>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <div
          className="staff-mobile-topbar"
          style={{
            alignItems: "center",
            gap: "var(--space-3)",
            padding: "var(--space-3) var(--space-4)",
            borderBottom: "1px solid var(--color-border)",
            backgroundColor: "var(--color-surface)",
          }}
        >
          <button
            onClick={() => setMobileNavOpen((v) => !v)}
            aria-label={mobileNavOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={mobileNavOpen}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "4px",
              color: "var(--color-text)",
            }}
          >
            {mobileNavOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <span style={{ fontSize: "var(--font-size-md)", fontWeight: "var(--font-weight-semibold)" }}>
            CareStack
          </span>
        </div>

        <main style={{ flex: 1, overflow: "auto" }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={getPageTransitionKey(location.pathname)}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}