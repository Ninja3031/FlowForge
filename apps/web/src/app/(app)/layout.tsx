"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { initials, roleLabel } from "@/lib/labels";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { sessionCleared } from "@/store/authSlice";

// Every page inside (app) needs a logged-in user
export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { status, user } = useAppSelector((state) => state.auth);

  useEffect(() => {
    if (status === "guest") router.replace("/login");
  }, [status, router]);

  async function logout() {
    try {
      await api.post("/auth/logout");
    } finally {
      dispatch(sessionCleared());
      router.push("/login");
    }
  }

  if (status !== "authenticated" || !user) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-muted">Loading...</div>;
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <Link href="/projects" className="flex items-center gap-2 font-extrabold tracking-tight">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-accent text-sm text-white">F</span>
              FlowForge
            </Link>
            <nav>
              <Link href="/projects" className="text-sm font-medium text-muted hover:text-ink">Projects</Link>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold leading-tight">{user.name}</p>
              <p className="text-xs text-muted">{roleLabel[user.role]}</p>
            </div>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-xs font-bold">
              {initials(user.name)}
            </span>
            <button onClick={logout} className="btn-secondary px-3 py-1.5">Log out</button>
          </div>
        </div>
      </header>

      {user.role === "SUPER_ADMIN" ? (
        <main className="mx-auto max-w-xl px-4 py-16 text-center">
          <h1 className="text-xl font-bold">You are signed in as a super admin</h1>
          <p className="mt-2 text-muted">
            Super admins do not belong to an organization. Use the admin console to manage the platform.
          </p>
        </main>
      ) : (
        <main className="mx-auto max-w-7xl px-4 py-8">{children}</main>
      )}
    </div>
  );
}