"use client";

import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { toastRemoved, type Toast } from "@/store/toastSlice";

function ToastItem({ toast }: { toast: Toast }) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    const timer = setTimeout(() => dispatch(toastRemoved(toast.id)), 3500);
    return () => clearTimeout(timer);
  }, [dispatch, toast.id]);

  return (
    <div
      role="status"
      className={`rounded-md px-4 py-3 text-sm font-medium text-white shadow-lg ${
        toast.type === "error" ? "bg-red-600" : "bg-ink"
      }`}
    >
      {toast.message}
    </div>
  );
}

export function Toaster() {
  const toasts = useAppSelector((state) => state.toasts);
  return (
    <div className="fixed right-4 bottom-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  );
}