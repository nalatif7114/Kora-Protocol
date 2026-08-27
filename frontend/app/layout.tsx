import type { Metadata } from "next";
import { SmoothScrollProvider } from "../components/providers/SmoothScrollProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kora Protocol — Modular, Risk-Aware Lending Infrastructure",
  description:
    "Institutional decentralized lending and borrowing infrastructure featuring deterministic Ray accounting, dynamic close factors, and multi-tier oracle risk guards.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark scroll-smooth">
      <body className="bg-background text-slate-100 min-h-screen selection:bg-accent/30 selection:text-white antialiased">
        <SmoothScrollProvider>
          {children}
        </SmoothScrollProvider>
      </body>
    </html>
  );
}
