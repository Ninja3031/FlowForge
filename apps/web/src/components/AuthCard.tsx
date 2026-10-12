"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ForgeBackdrop } from "./ForgeBackdrop";

export function AuthCard({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <main className="relative flex min-h-screen items-center justify-center px-4 py-16">
      <ForgeBackdrop size="soft" />

      <motion.div
        className="relative w-full max-w-sm"
        initial={{ opacity: 0, y: 24, filter: "blur(6px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      >
        <Link href="/" className="display mb-8 block text-center text-2xl">
          FlowForge
        </Link>
        <div className="panel bg-surface/80 p-7 shadow-2xl shadow-black/60 backdrop-blur-md">
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          <p className="mt-1 mb-6 text-sm text-muted">{subtitle}</p>
          {children}
        </div>
        <p className="mt-6 text-center text-sm text-muted">{footer}</p>
      </motion.div>
    </main>
  );
}