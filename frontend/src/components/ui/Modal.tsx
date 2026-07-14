import { useEffect, useRef, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";

/**
 * Shared Modal component. Handles its own mount/unmount animation via
 * AnimatePresence internally — callers just pass `isOpen`, no need to
 * wrap usage in AnimatePresence themselves. Closes on backdrop click or
 * Escape key. Moves keyboard focus into the dialog on open and restores
 * it to whatever was focused before (e.g. the button that opened it) on
 * close — without this, a keyboard user's focus is silently left on/near
 * an element that's now hidden behind the backdrop.
 */
export function Modal({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = "480px",
}: {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  maxWidth?: string;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      previouslyFocusedRef.current = document.activeElement as HTMLElement | null;
      dialogRef.current?.focus();
    } else {
      previouslyFocusedRef.current?.focus();
    }
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={onClose}
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(44, 44, 42, 0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "20px",
          }}
        >
          <motion.div
            ref={dialogRef}
            tabIndex={-1}
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            style={{
              backgroundColor: "var(--color-surface)",
              borderRadius: "var(--radius-lg)",
              boxShadow: "0 20px 48px rgba(44, 44, 42, 0.18)",
              width: "100%",
              maxWidth,
              maxHeight: "85vh",
              overflowY: "auto",
              padding: "var(--space-6)",
              outline: "none",
            }}
          >
            {title && (
              <div
                style={{
                  fontSize: "var(--font-size-lg)",
                  fontWeight: "var(--font-weight-semibold)",
                  marginBottom: "var(--space-4)",
                }}
              >
                {title}
              </div>
            )}
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}