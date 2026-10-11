"use client";

import { useEffect } from "react";
import { Provider } from "react-redux";
import { store } from "@/store";
import { refreshSession } from "@/lib/api";
import { Toaster } from "@/components/Toaster";

// On first load, use the refresh cookie (if any) to log the user back in
function SessionRestorer() {
  useEffect(() => {
    refreshSession();
  }, []);
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <SessionRestorer />
      {children}
      <Toaster />
    </Provider>
  );
}