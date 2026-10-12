import type { Metadata } from "next";
import { Archivo, Manrope } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

// Heavy display face for big cinematic headings, soft rounded face for everything else
const archivo = Archivo({ subsets: ["latin"], weight: ["800", "900"], variable: "--font-archivo" });
const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope" });

export const metadata: Metadata = {
  title: { default: "FlowForge", template: "%s | FlowForge" },
  description: "Plan sprints, track tasks on a Kanban board, and let AI summarize progress.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${archivo.variable} ${manrope.variable}`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}