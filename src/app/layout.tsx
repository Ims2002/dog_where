import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";

import { siteUrl } from "@/lib/env";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "DogWhere — Mascotas encontradas en tu zona",
    template: "%s · DogWhere",
  },
  description:
    "Publica la foto de un animal que has encontrado o visto suelto para que su familia pueda recuperarlo.",
};

export const viewport: Viewport = {
  themeColor: "#f59e0b",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${GeistSans.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
