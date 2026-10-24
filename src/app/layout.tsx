import type { Metadata, Viewport } from "next";
import "./globals.css";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  metadataBase: new URL(env.siteUrl),
  title: {
    default: "The Varsity Pilot | Department of Communication and Media Studies, University of Liberia",
    template: "%s | The Varsity Pilot",
  },
  description:
    "Campus and national news, features, opinion and multimedia from The Varsity Pilot, the student newspaper of the Department of Communication and Media Studies at the University of Liberia.",
  applicationName: "The Varsity Pilot",
  authors: [{ name: "The Varsity Pilot, University of Liberia" }],
  icons: {
    icon: [
      { url: "/brand/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/brand/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/brand/apple-touch-icon.png", sizes: "180x180" }],
  },
  openGraph: {
    type: "website",
    siteName: "The Varsity Pilot",
    locale: "en_LR",
    title: "The Varsity Pilot | University of Liberia",
    description:
      "Illuminating journalism for a brighter future — campus and national reporting from the Department of Communication and Media Studies.",
    images: [{ url: "/brand/og-image.png", width: 1200, height: 630, alt: "The Varsity Pilot" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "The Varsity Pilot | University of Liberia",
    description:
      "Illuminating journalism for a brighter future — campus and national reporting from the Department of Communication and Media Studies.",
  },
  robots: { index: true, follow: true },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#10104F",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="flex min-h-dvh flex-col">{children}</body>
    </html>
  );
}
