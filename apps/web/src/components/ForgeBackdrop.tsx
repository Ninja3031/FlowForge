"use client";

import { motion } from "motion/react";

// ---- Hill with a grassy edge, drawn once as an SVG path ----
// A simple number "hash" gives the same random-looking values on the server and in the
// browser, so React doesn't complain about mismatched HTML.
const hash = (n: number) => Math.abs(Math.sin(n * 12.9898) * 43758.5453) % 1;

function hillPath(): string {
  const width = 1440;
  const top = (x: number) => 175 - 95 * Math.exp(-(((x - 720) / 540) ** 2));
  let d = `M0,320 L0,${top(0).toFixed(1)}`;
  for (let x = 0; x <= width; x += 8) {
    const y = top(x);
    const blade = 3 + hash(x) * 14;
    d += ` L${x},${y.toFixed(1)} L${x + 2},${(y - blade).toFixed(1)} L${x + 4},${y.toFixed(1)}`;
  }
  return `${d} L${width},320 Z`;
}

const HILL = hillPath();

const EMBERS = Array.from({ length: 26 }, (_, i) => ({
  left: 20 + hash(i + 1) * 60,
  size: 2 + hash(i + 7) * 3,
  delay: hash(i + 13) * 7,
  duration: 6 + hash(i + 21) * 6,
  drift: (hash(i + 31) - 0.5) * 120,
}));

/**
 * The FlowForge "sunrise": a glowing forge-sun rising behind a dark hill,
 * with embers drifting up. Used on the landing page and the login screens.
 */
export function ForgeBackdrop({ size = "hero" }: { size?: "hero" | "soft" }) {
  const sun = size === "hero" ? "clamp(280px, 46vw, 680px)" : "clamp(260px, 38vw, 520px)";

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Big soft glow that lights up the whole sky */}
      <motion.div
        className="absolute left-1/2 -translate-x-1/2 rounded-full"
        style={{
          width: `calc(${sun} * 2.2)`,
          height: `calc(${sun} * 2.2)`,
          bottom: `calc(${sun} * -0.75)`,
          background: "radial-gradient(circle, rgb(255 138 61 / 0.32) 0%, rgb(255 110 40 / 0.12) 35%, transparent 65%)",
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 2.4, ease: "easeOut" }}
      />

      {/* The sun itself: rises up, then gently "breathes" */}
      <motion.div
        className="absolute left-1/2"
        style={{ width: sun, height: sun, marginLeft: `calc(${sun} / -2)`, bottom: `calc(${sun} * -0.28)` }}
        initial={{ y: "35%", opacity: 0 }}
        animate={{ y: "0%", opacity: 1 }}
        transition={{ duration: 2.2, ease: [0.22, 1, 0.36, 1] }}
      >
        <div
          className="h-full w-full animate-sun rounded-full"
          style={{
            background:
              "radial-gradient(circle, #fffaf0 0%, #ffefd6 42%, #ffcf98 64%, #ff9d50 78%, #e8692a 86%, rgb(232 105 42 / 0) 91%)",
            boxShadow: "0 0 120px 40px rgb(255 138 61 / 0.35)",
          }}
        />
      </motion.div>

      {/* Embers floating up */}
      {EMBERS.map((ember, i) => (
        <span
          key={i}
          className="absolute bottom-[18%] animate-ember rounded-full bg-glow"
          style={
            {
              left: `${ember.left}%`,
              width: ember.size,
              height: ember.size,
              animationDelay: `${ember.delay}s`,
              animationDuration: `${ember.duration}s`,
              boxShadow: "0 0 8px 2px rgb(255 160 90 / 0.8)",
              "--drift": `${ember.drift}px`,
            } as React.CSSProperties
          }
        />
      ))}

      {/* Dark hill in front */}
      <svg
        className="absolute inset-x-0 bottom-0 h-[38%] w-full"
        viewBox="0 0 1440 320"
        preserveAspectRatio="none"
      >
        <path d={HILL} fill="#090706" />
      </svg>
    </div>
  );
}