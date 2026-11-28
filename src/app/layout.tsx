import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";

import { AuthProvider } from "@/context/AuthContext";
import "./globals.css";

const appFont = Plus_Jakarta_Sans({ variable: "--font-app", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AshrafiTech · Hospital Management System",
  description: "AshrafiTech admin panel for patients, doctors, appointments, ambulances and hospitals. Smart Healthcare. Better Tomorrow.",
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
