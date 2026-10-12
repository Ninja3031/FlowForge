"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { initials, roleLabel } from "@/lib/labels";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { sessionCleared } from "@/store/authSlice";

// Every page inside (app) needs a logged-in user
export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
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
    return (
      <div className="flex min-h-screen items-center justify-center">
        <span className="h-3 w-3 animate-pulse-soft rounded-full bg-accent shadow-[0_0_20px_var(--color-accent)]" />
        <span className="sr-only">Loading</span>
      </div>
    );
  }

  const onProjects = pathname.startsWith("/projects");

  return (
    <div className="min-h-screen">
      {/* Soft ember glow at the top of every page */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 -top-64 mx-auto h-96 max-w-4xl rounded-full opacity-60 blur-3xl"
        style={{ background: "radial-gradient(circle, rgb(255 138 61 / 0.18), transparent 70%)" }}
      />

      <header className="sticky top-0 z-30 border-b border-line/70 bg-canvas/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5">
          <div className="flex items-center gap-8">
            <Link href="/" className="display text-lg">
              FlowForge
            </Link>
            <nav>
              <Link
                href="/projects"
                className={`text-sm font-semibold transition-colors ${onProjects ? "text-ink" : "text-muted hover:text-ink"}`}
              >
                Projects
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold leading-tight">{user.name}</p>
              <p className="text-xs text-faint">{roleLabel[user.role]}</p>
            </div>
            <span className="avatar h-9 w-9 text-xs">{initials(user.name)}</span>
            <button onClick={logout} className="btn-secondary px-4 py-1.5">
              Log out
            </button>
          </div>
        </div>
      </header>

      {user.role === "SUPER_ADMIN" ? (
        <main className="relative mx-auto max-w-xl px-5 py-24 text-center">
          <h1 className="display text-4xl">Super admin</h1>
          <p className="mt-4 text-muted">
            Super admins do not belong to an organization. Use the admin console to manage the platform.
          </p>
        </main>
      ) : (
        <main className="relative mx-auto max-w-7xl px-5 py-10">{children}</main>
      )}
    </div>
  );
}