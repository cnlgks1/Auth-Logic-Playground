import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nexus Auth System",
  description: "Advanced OAuth 2.0 Demonstration",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen bg-slate-950 text-slate-50 selection:bg-cyan-500/30">
        {children}
      </body>
    </html>
  );
}
