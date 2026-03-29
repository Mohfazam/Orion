import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Orion Dashboard",
  description: "AI-powered website auditing",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
