import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";

import "./globals.css";

const inter = Inter({
  subsets: ["latin", "latin-ext"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: {
    default: "Prodora",
    template: "%s · Prodora",
  },
  description:
    "Internet prodavnica za kupce i odvojeno poručivanje za firme. Korpa, cenovnik, statusi i potvrda porudžbine u dinarima.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sr" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full bg-background font-sans text-foreground">
        <a href="#sadrzaj" className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-card focus:px-3 focus:py-2">
          Preskoči na sadržaj
        </a>
        <div id="sadrzaj">{children}</div>
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
