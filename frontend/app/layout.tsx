import type { Metadata } from "next";
import "./globals.css";
import Nav from "@/components/Nav";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "BacktestLab NSE",
  description: "Pick an NSE stock and a strategy. See what it would have done, costs included. Educational, not investment advice.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Press+Start+2P&family=Doto:wght@500;700&family=Space+Mono:ital,wght@0,400;0,700;1,400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Suspense fallback={null}><Nav /></Suspense>
        <main className="mx-auto max-w-[1280px] px-4 pb-16">{children}</main>
        <footer className="mx-auto max-w-[1280px] px-4 py-8 border-t border-line text-faint text-[11px]">
          Educational tool. Past performance on adjusted Yahoo Finance data says little about the future. Not investment advice.
        </footer>
      </body>
    </html>
  );
}
