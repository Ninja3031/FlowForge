"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { useAppSelector } from "@/store/hooks";
import { ForgeBackdrop } from "@/components/ForgeBackdrop";
import { Reveal } from "@/components/motion/Reveal";

const WORD = "FLOWFORGE";
const ease = [0.22, 1, 0.36, 1] as const;

const FEATURES = [
  {
    title: "A board that keeps up",
    body: "Drag tasks across the Kanban board and they move instantly. Saving happens quietly in the background.",
  },
  {
    title: "AI that reads the room",
    body: "Summarize a long task thread, turn a plain sentence into a task, or get a health report on the whole project.",
  },
  {
    title: "Built for the whole team",
    body: "Roles for admins, project managers and members, plus a separate console for running the platform.",
  },
];

const STACK = ["Next.js", "React", "Angular", "RxJS", "Node.js", "MySQL", "MongoDB", "Redis", "Docker"];

function useCta() {
  const status = useAppSelector((state) => state.auth.status);
  return status === "authenticated"
    ? { href: "/projects", label: "Open your projects" }
    : { href: "/login", label: "Try the demo" };
}

export function Landing() {
  const cta = useCta();

  return (
    <div className="overflow-x-hidden">
      {/* ---- Top bar ---- */}
      <header className="fixed inset-x-0 top-0 z-40">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5">
          <Link href="/" className="display text-lg tracking-tight">
            FlowForge
          </Link>
          <nav className="flex items-center gap-2">
            <Link href="/login" className="btn-secondary hidden border-transparent sm:inline-flex">
              Log in
            </Link>
            <Link href={cta.href} className="btn-primary">
              {cta.label}
            </Link>
          </nav>
        </div>
      </header>

      {/* ---- Hero ---- */}
      <section className="relative flex h-[100svh] min-h-[560px] flex-col items-center">
        <ForgeBackdrop />

        <h1 className="display relative mt-[14vh] flex w-full justify-center px-3 text-[clamp(3.2rem,15.5vw,15rem)] text-[#f4ece2]">
          <span className="sr-only">FlowForge</span>
          {WORD.split("").map((letter, i) => (
            <span key={i} aria-hidden className="inline-block overflow-hidden pb-[0.04em]">
              <motion.span
                className="inline-block"
                initial={{ y: "105%" }}
                animate={{ y: "0%" }}
                transition={{ duration: 1.1, delay: 0.15 + i * 0.06, ease }}
              >
                {letter}
              </motion.span>
            </span>
          ))}
        </h1>

        <motion.div
          className="relative mt-auto mb-[7vh] flex flex-col items-center px-5 text-center"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 1.3, ease }}
        >
          <p className="eyebrow">Project management, forged with AI</p>
          <p className="mt-3 max-w-xl text-lg text-ink/80 sm:text-xl">
            Plan the work. Track the flow. Ship what matters.
          </p>
          <div className="mt-6 flex gap-3">
            <Link href={cta.href} className="btn-primary px-6 py-2.5">
              {cta.label}
            </Link>
            <a href="#features" className="btn-secondary px-6 py-2.5">
              See how it works
            </a>
          </div>
        </motion.div>
      </section>

      {/* ---- Moving ticker ---- */}
      <section aria-hidden className="border-y border-line py-5">
        <div className="flex w-max animate-marquee">
          {[0, 1].map((copy) => (
            <div key={copy} className="flex shrink-0">
              {["Plan", "Track", "Summarize", "Ship"].flatMap((word) => [word, "//"]).concat(["Plan", "//", "Track", "//"]).map((word, i) => (
                <span
                  key={i}
                  className={`display px-4 text-4xl sm:text-6xl ${word === "//" ? "text-accent" : "text-ink/15"}`}
                >
                  {word}
                </span>
              ))}
            </div>
          ))}
        </div>
      </section>

      {/* ---- Features ---- */}
      <section id="features" className="mx-auto max-w-6xl px-5 py-28">
        <Reveal>
          <p className="eyebrow">What it does</p>
          <h2 className="display mt-4 max-w-3xl text-5xl sm:text-7xl">Less status chasing. More shipping.</h2>
        </Reveal>

        <ol className="mt-16 border-t border-line">
          {FEATURES.map((feature, i) => (
            <li key={feature.title}>
              <Reveal delay={i * 0.08}>
                <div className="group grid gap-4 border-b border-line py-10 transition-colors duration-500 hover:bg-surface/60 sm:grid-cols-[120px_1fr_1fr] sm:px-4">
                  <span className="display text-2xl text-faint transition-colors duration-500 group-hover:text-accent">
                    0{i + 1}
                  </span>
                  <h3 className="display text-3xl transition-transform duration-500 ease-out-soft group-hover:translate-x-2 sm:text-4xl">
                    {feature.title}
                  </h3>
                  <p className="max-w-md text-muted">{feature.body}</p>
                </div>
              </Reveal>
            </li>
          ))}
        </ol>
      </section>

      {/* ---- Tech stack ---- */}
      <section className="mx-auto max-w-6xl px-5 pb-28">
        <Reveal>
          <p className="eyebrow">Under the hood</p>
          <ul className="mt-6 flex flex-wrap gap-2">
            {STACK.map((tech) => (
              <li key={tech} className="rounded-full border border-line px-4 py-1.5 text-sm text-muted">
                {tech}
              </li>
            ))}
          </ul>
        </Reveal>
      </section>

      {/* ---- Closing call to action ---- */}
      <section className="relative overflow-hidden border-t border-line py-32 text-center">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -bottom-1/2 mx-auto h-[600px] w-[600px] rounded-full"
          style={{ background: "radial-gradient(circle, rgb(255 138 61 / 0.25), transparent 65%)" }}
        />
        <Reveal className="relative px-5">
          <h2 className="display mx-auto max-w-4xl text-5xl sm:text-8xl">Got work worth shipping?</h2>
          <Link href={cta.href} className="btn-primary mt-10 px-8 py-3 text-base">
            {cta.label}
          </Link>
        </Reveal>
      </section>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-5 py-6 text-sm text-faint">
          <span className="display text-base text-muted">FlowForge</span>
          <span>A full-stack portfolio project.</span>
        </div>
      </footer>
    </div>
  );
}