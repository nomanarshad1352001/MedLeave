import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Fraunces, Inter } from "next/font/google";
import { ThemeSync } from "@/components/ThemeSwitcher";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

export const metadata: Metadata = {
  title: "MedLeave & SessionTracker — Clinical leave, elegantly under control",
  description:
    "The multi-tenant leave management and rolling 12-month session tracking platform for GP surgeries, PCNs and medical partnerships.",
};

/**
 * Applies the persisted theme before first paint so there is never a flash
 * of the default palette. Reads the same localStorage key the store uses.
 */
const THEME_BOOT = `(function(){try{var t="modern";var raw=localStorage.getItem("medleave-store");if(raw){var j=JSON.parse(raw);if(j&&j.state&&j.state.theme){t=j.state.theme;}}if(t!=="modern"&&t!=="classic"){t="modern";}document.documentElement.setAttribute("data-theme",t);}catch(e){document.documentElement.setAttribute("data-theme","modern");}})();`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-theme="modern" className={`${inter.variable} ${fraunces.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
      </head>
      <body className="bg-paper font-sans text-ink antialiased">
        <ThemeSync />
        {children}
      </body>
    </html>
  );
}
