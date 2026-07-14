import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";

export type ToastVariant = "info" | "success" | "warning" | "danger";

type ToastItem = { id: string; message: string; variant: ToastVariant };

type ToastContextValue = { showToast: (message: string, variant?: ToastVariant) => void };

const ToastContext = createContext<ToastContextValue | null>(null);

const variantStyles: Record<ToastVariant, { bg: string; text: string }> = {
  info: { bg: "var(--color-teal-dark)", text: "#ffffff" },
  success: { bg: "var(--color-teal)", text: "#ffffff" },
  warning: { bg: "var(--color-amber)", text: "#ffffff" },
  danger: { bg: "var(--color-coral)", text: "#ffffff" },
};

const TOAST_DURATION_MS = 4000;

/**
 * Wrap the app (or a section of it) in <ToastProvider> once, then call
 * useToast() from any component inside it to fire a transient, auto-
 * dismissing notification. Stacks in the bottom-right corner, animates in
 * and out via Framer Motion.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((message: string, variant: ToastVariant = "info") => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setToasts((prev) => [...prev, { id, message, variant }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, TOAST_DURATION_MS);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        role="status"
        aria-live="polite"
        style={{
          position: "fixed",
          bottom: "24px",
          right: "24px",
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          zIndex: 2000,
        }}
      >
        <AnimatePresence>
          {toasts.map((toast) => {
            const colors = variantStyles[toast.variant];
            return (
              <motion.div
                key={toast.id}
                initial={{ opacity: 0, y: 12, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, x: 24, scale: 0.96 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                style={{
                  backgroundColor: colors.bg,
                  color: colors.text,
                  padding: "12px 18px",
                  borderRadius: "var(--radius-md)",
                  boxShadow: "0 8px 24px rgba(44, 44, 42, 0.18)",
                  fontSize: "var(--font-size-sm)",
                  maxWidth: "320px",
                }}
              >
                {toast.message}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be called from within a <ToastProvider>");
  }
  return ctx.showToast;
}