import type { Metadata } from "next";
import { Inter } from "next/font/google";

import { AuthProvider } from "@/context/AuthContext";
import "./globals.css";

// PLACEHOLDER font — swap for the typeface used in the Figma file.
const appFont = Inter({ variable: "--font-app", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Hospital Management System Admin",
  description: "Admin panel for the Hospital Management System",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${appFont.variable} h-full antialiased`}>
      <body className="min-h-full">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
