import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import "./globals.css";

const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plex-sans",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Rolling Libur MagangHub — PT Ethes Teknologi Makmur",
  description:
    "Jadwal rolling libur Jumat / Sabtu MagangHub PT Ethes Teknologi Makmur: Junior Mobile App Engineer, Junior Web Engineer, dan System Analyst.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className={`${plexSans.variable} ${plexMono.variable}`}>{children}</body>
    </html>
  );
}
