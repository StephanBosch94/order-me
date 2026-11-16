import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";
import { Toaster } from "sonner";

import { ResumeEmailSession } from "@/components/auth/resume-email-session";

import "./globals.css";

const inter = Inter({
  subsets: ["latin", "latin-ext"],
  variable: "--font-inter",
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin", "latin-ext"],
  weight: ["700", "800"],
  variable: "--font-jakarta",
  fallback: ["system-ui", "Helvetica", "Arial", "sans-serif"],
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin", "latin-ext"],
  weight: ["500"],
  variable: "--font-jetbrains",
  fallback: ["ui-monospace", "monospace"],
});

export const metadata: Metadata = {
  title: {
    default: "Vendro",
    template: "%s · Vendro",
  },
  description:
    "Internet prodavnica za kupce i odvojeno poručivanje za firme. Korpa, cenovnik, statusi i potvrda porudžbine u dinarima.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sr" className={`${inter.variable} ${jakarta.variable} ${jetbrains.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full bg-background font-sans text-foreground">
        <a href="#sadrzaj" className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-card focus:px-3 focus:py-2">
          Preskoči na sadržaj
        </a>
        <div id="sadrzaj">{children}</div>
        <ResumeEmailSession />
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
