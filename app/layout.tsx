import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rolling Libur MagangHub — PT Ethes Teknologi Makmur",
  description:
    "Jadwal rolling libur Jumat / Sabtu MagangHub PT Ethes Teknologi Makmur: Junior Mobile App Engineer, Junior Web Engineer, dan System Analyst.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
