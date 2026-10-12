"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { toastRemoved, type Toast } from "@/store/toastSlice";

function ToastItem({ toast }: { toast: Toast }) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    const timer = setTimeout(() => dispatch(toastRemoved(toast.id)), 3500);
    return () => clearTimeout(timer);
  }, [dispatch, toast.id]);

  return (
    <motion.div
      layout
      role="status"
      initial={{ opacity: 0, y: 16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 40, transition: { duration: 0.2 } }}
      transition={{ type: "spring", stiffness: 380, damping: 30 }}
      className="flex items-center gap-3 rounded-xl border border-line bg-raised/95 px-4 py-3 text-sm text-ink shadow-xl shadow-black/50 backdrop-blur"
    >
      <span
        className={`h-2 w-2 shrink-0 rounded-full ${toast.type === "error" ? "bg-danger" : "bg-accent"}`}
        style={{ boxShadow: `0 0 10px ${toast.type === "error" ? "var(--color-danger)" : "var(--color-accent)"}` }}
      />
      {toast.message}
    </motion.div>
  );
}

export function Toaster() {
  const toasts = useAppSelector((state) => state.toasts);
  return (
    <div className="fixed right-4 bottom-4 z-50 flex flex-col items-end gap-2">
      <AnimatePresence initial={false}>
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} />
        ))}
      </AnimatePresence>
    </div>
  );
}