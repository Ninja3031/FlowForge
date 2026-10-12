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

export default function RegisterPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const status = useAppSelector((state) => state.auth.status);

  const [form, setForm] = useState({ name: "", email: "", password: "", organizationName: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (status === "authenticated") router.replace("/projects");
  }, [status, router]);

  function update(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const { data } = await api.post<SessionResponse>("/auth/register", form);
      dispatch(sessionStarted(data));
      router.push("/projects");
    } catch (err) {
      setError(getErrorMessage(err));
      setSubmitting(false);
    }
  }

  return (
    <AuthCard
      title="Create your organization"
      subtitle="You'll be the admin and can add teammates after."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="link">Log in</Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="org" className="label">Organization name</label>
          <input id="org" className="input" value={form.organizationName}
            onChange={(e) => update("organizationName", e.target.value)} required />
        </div>
        <div>
          <label htmlFor="name" className="label">Your name</label>
          <input id="name" className="input" value={form.name}
            onChange={(e) => update("name", e.target.value)} required autoComplete="name" />
        </div>
        <div>
          <label htmlFor="email" className="label">Email</label>
          <input id="email" type="email" className="input" value={form.email}
            onChange={(e) => update("email", e.target.value)} required autoComplete="email" />
        </div>
        <div>
          <label htmlFor="password" className="label">Password</label>
          <input id="password" type="password" className="input" value={form.password} minLength={8}
            onChange={(e) => update("password", e.target.value)} required autoComplete="new-password" />
          <p className="mt-1 text-xs text-faint">At least 8 characters.</p>
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
        <button type="submit" className="btn-primary w-full py-2.5" disabled={submitting}>
          {submitting ? "Creating..." : "Create organization"}
        </button>
      </form>
    </AuthCard>
  );
}