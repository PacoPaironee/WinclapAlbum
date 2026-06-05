import type { Metadata, Viewport } from "next";
import { Inter, Fraunces } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

// Aproximación a "Reckless" (serif de los titulares de Winclap)
const display = Fraunces({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: "Álbum del Mundial · Winclap",
  description: "El álbum del Mundial de la oficina de Winclap, completado entre todos.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1cc9b9",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`h-full antialiased ${inter.variable} ${display.variable}`}
    >
      <body className="min-h-full">{children}</body>
    </html>
  );
}
