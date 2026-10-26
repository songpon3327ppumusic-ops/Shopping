import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LUMIÈRE STUDIO | Everyday elegance",
  description: "เสื้อผ้าคัดสรรและบริการออกแบบโลโก้สำหรับแบรนด์ของคุณ โดย LUMIÈRE STUDIO",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}