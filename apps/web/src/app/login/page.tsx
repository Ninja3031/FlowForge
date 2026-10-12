"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import type { SessionResponse } from "@/lib/types";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { sessionStarted } from "@/store/authSlice";
import { AuthCard } from "@/components/AuthCard";

const DEMO = { email: "rahul@acme.dev", password: "Password@123" };

export default function LoginPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const status = useAppSelector((state) => state.auth.status);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Already logged in? Skip this page
  useEffect(() => {
    if (status === "authenticated") router.replace("/projects");
  }, [status, router]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const { data } = await api.post<SessionResponse>("/auth/login", { email, password });
      dispatch(sessionStarted(data));
      router.push("/projects");
    } catch (err) {
      setError(getErrorMessage(err));
      setSubmitting(false);
    }
  }

  return (
    <AuthCard
      title="Welcome back"
      subtitle="Pick up where your team left off."
      footer={
        <>
          New here?{" "}
          <Link href="/register" className="link">
            Create an organization
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="label">Email</label>
          <input id="email" type="email" className="input" value={email}
            onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        </div>
        <div>
          <label htmlFor="password" className="label">Password</label>
          <input id="password" type="password" className="input" value={password}
            onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
        <button type="submit" className="btn-primary w-full py-2.5" disabled={submitting}>
          {submitting ? "Logging in..." : "Log in"}
        </button>
      </form>

      <div className="mt-5 rounded-lg border border-dashed border-line p-3 text-sm">
        <p className="text-muted">Just looking around? Use the demo project manager account.</p>
        <button
          type="button"
          className="link mt-1.5"
          onClick={() => {
            setEmail(DEMO.email);
            setPassword(DEMO.password);
          }}
        >
          Fill in demo login
        </button>
      </div>
    </AuthCard>
  );
}