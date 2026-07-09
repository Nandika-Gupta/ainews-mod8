import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "The AI Signal — AI News",
  description: "AI news across the AI ecosystem — models, research, funding, and policy.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-base text-primary">{children}</body>
    </html>
  );
}
