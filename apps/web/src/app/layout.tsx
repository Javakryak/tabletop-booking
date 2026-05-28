import type { Metadata } from "next";
import type { ReactNode } from "react";

import { SiteHeader } from "@/components/layout/site-header";

import "./globals.css";

export const metadata: Metadata = {
  title: "Tabletop Booking",
  description: "Клубная система бронирования настольных игр"
};

export default function RootLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className="min-h-screen bg-background text-foreground">
        <div className="relative flex min-h-screen flex-col">
          <SiteHeader />
          <main className="page-shell flex-1">{children}</main>
          <footer className="mt-12 border-t border-border bg-card/80">
            <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-5 text-xs uppercase tracking-[0.12em] text-muted-foreground sm:px-6">
              <span>Штандарт · клуб настольных игр</span>
              <span>Tabletop Booking</span>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
