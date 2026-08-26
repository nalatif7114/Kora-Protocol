import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kora Protocol — Modular, Risk-Aware Lending Infrastructure",
  description:
    "Institutional decentralized money market featuring deterministic Ray accounting, dynamic close factors, and multi-tier oracle risk guards.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-background text-slate-100 min-h-screen">
        {children}
      </body>
    </html>
  );
}
