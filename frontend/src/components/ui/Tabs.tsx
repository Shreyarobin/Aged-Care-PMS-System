import { motion } from "framer-motion";
import type { ComponentType } from "react";

export type TabItem = {
  key: string;
  label: string;
  onClick: () => void;
  icon?: ComponentType<{ size?: number }>;
};

/**
 * Shared Tabs component. Deliberately NOT coupled to react-router — each
 * item's onClick is provided by the caller (e.g. `() => navigate(path)`),
 * keeping this purely presentational and reusable anywhere.
 *
 * The active tab's underline slides smoothly between tabs via Framer
 * Motion's shared layout animation (layoutId) rather than just appearing —
 * a small but genuinely "premium" touch. If more than one Tabs instance
 * ever appears on the same page, give each a distinct layoutGroupId so
 * their underline animations don't interfere with each other.
 */
export function Tabs({
  items,
  activeKey,
  layoutGroupId = "tabs-underline",
}: {
  items: TabItem[];
  activeKey: string;
  layoutGroupId?: string;
}) {
  return (
    <div role="tablist" style={{ display: "flex", gap: "4px", borderBottom: "1px solid var(--color-border)", overflowX: "auto" }}>
      {items.map((item) => {
        const isActive = item.key === activeKey;
        const Icon = item.icon;
        return (
          <button
            key={item.key}
            role="tab"
            aria-selected={isActive}
            onClick={item.onClick}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "10px 16px",
              fontSize: "var(--font-size-base)",
              cursor: "pointer",
              color: isActive ? "var(--color-teal)" : "var(--color-text-muted)",
              fontWeight: isActive ? "var(--font-weight-medium)" : "var(--font-weight-normal)",
              position: "relative",
              whiteSpace: "nowrap",
              transition: "color var(--duration-fast) var(--ease-standard)",
              background: "none",
              border: "none",
              fontFamily: "inherit",
            }}
          >
            {Icon && <Icon size={15} />}
            {item.label}
            {isActive && (
              <motion.div
                layoutId={layoutGroupId}
                transition={{ duration: 0.25, ease: "easeOut" }}
                style={{
                  position: "absolute",
                  bottom: "-1px",
                  left: 0,
                  right: 0,
                  height: "2px",
                  backgroundColor: "var(--color-teal)",
                }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}