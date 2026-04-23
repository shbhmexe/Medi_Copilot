import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: "MedCoPilot — AI Clinical Decision Support",
  description: "AI-powered clinical decision support system for doctors in India. Real-time differential diagnosis, drug interaction checks, and SOAP note generation.",
  keywords: "clinical decision support, AI diagnosis, EMR, India, ABDM, drug interactions",
  authors: [{ name: "MedCoPilot Team" }],
  openGraph: {
    title: "MedCoPilot — AI Clinical Decision Support",
    description: "Real-time AI medical co-pilot for Indian doctors",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=JetBrains+Mono:wght@400;500&family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;1,400&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
