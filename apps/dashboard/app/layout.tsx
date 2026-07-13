import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const appFont = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-poppins",
  display: "swap",
});

export const metadata: Metadata = {
  title: "PurposeMint Dashboard",
  description: "PurposeMint platform administration dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={appFont.variable}>{children}</body>
    </html>
  );
}
