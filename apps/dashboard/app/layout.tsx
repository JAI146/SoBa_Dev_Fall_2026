import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";

const appFont = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
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
