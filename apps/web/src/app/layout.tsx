import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Orion Dashboard",
  description: "AI-powered website auditing",
};

import { ThemeProvider } from "./_components/ThemeProvider";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
