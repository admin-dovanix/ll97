import type { ReactNode } from "react";
import "./globals.css";

export const metadata = {
  title: "AirWise",
  description: "LL97 compliance and ventilation monitoring workspace"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
