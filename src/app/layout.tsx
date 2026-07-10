import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/layout/app-shell";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "AI Engineering Playground",
  description: "A reusable Next.js 15 dashboard for GenAI cohort assignments.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>
        <AppShell>{children}</AppShell>
        <Toaster theme="dark" richColors position="top-right" />
      </body>
    </html>
  );
}
