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
    <html className="dark" lang="ru">
      <body className="min-h-screen bg-background">
        <div className="relative min-h-screen">
          <SiteHeader />
          <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">{children}</main>
        </div>
      </body>
    </html>
  );
}
