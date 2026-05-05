import { useEffect } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";

import { MOTION_FAST } from "../utils/motion.js";

/**
 * Lightweight, Shadcn-style dialog.
 *
 *  - Portal-mounted at document.body so it escapes any layout container.
 *  - Backdrop click and Escape key close the dialog.
 *  - Body scroll is locked while open and restored on close.
 *  - Optional `title`, `description`, and `footer` slots.
 *
 * Intentionally avoids pulling in Radix or Shadcn directly to keep the
 * dependency footprint small; the API mirrors theirs closely enough that we
 * can swap to a real Shadcn `Dialog` later with a one-line change.
 */
export default function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "lg",
  className = "",
}) {
  useEffect(() => {
    if (!open) return undefined;

    const onKey = (event) => {
      if (event.key === "Escape") onClose?.();
    };

    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (typeof document === "undefined") return null;

  const sizeClass =
    size === "sm"
      ? "max-w-sm"
      : size === "md"
        ? "max-w-md"
        : size === "xl"
          ? "max-w-3xl"
          : "max-w-2xl";

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial="hidden"
          animate="visible"
          exit="hidden"
        >
          <motion.div
            onClick={onClose}
            variants={{
              hidden: { opacity: 0 },
              visible: { opacity: 1 },
            }}
            transition={{ duration: MOTION_FAST }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            aria-hidden="true"
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? "dialog-title" : undefined}
            aria-describedby={description ? "dialog-description" : undefined}
            variants={{
              hidden: { opacity: 0, scale: 0.96, y: 8 },
              visible: { opacity: 1, scale: 1, y: 0 },
            }}
            transition={{ duration: MOTION_FAST, ease: "easeOut" }}
            className={`relative z-10 max-h-[90vh] w-full ${sizeClass} overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl ${className}`}
          >
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="absolute right-4 top-4 z-10 inline-flex h-8 w-8 items-center justify-center rounded-md text-text-hint transition hover:bg-gray-100 hover:text-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <X size={18} />
            </button>

            {(title || description) && (
              <div className="border-b border-gray-100 px-6 py-5 pr-12">
                {title ? (
                  <h2
                    id="dialog-title"
                    className="text-lg font-semibold text-text-primary"
                  >
                    {title}
                  </h2>
                ) : null}
                {description ? (
                  <p
                    id="dialog-description"
                    className="mt-1 text-sm text-text-hint"
                  >
                    {description}
                  </p>
                ) : null}
              </div>
            )}

            <div className="max-h-[calc(90vh-9rem)] overflow-y-auto px-6 py-5">
              {children}
            </div>

            {footer ? (
              <div className="flex items-center justify-end gap-2 border-t border-gray-100 bg-gray-50 px-6 py-4">
                {footer}
              </div>
            ) : null}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body
  );
}
