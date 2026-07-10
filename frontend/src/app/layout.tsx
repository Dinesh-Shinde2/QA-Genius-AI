import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import ThemeInit from "@/components/ThemeInit";

const inter = Inter({
 subsets: ["latin"],
 variable: "--font-sans",
});

export const metadata: Metadata = {
 title: "QA Genius AI - Modern Test Case & Bug Management Platform",
 description: "Upload Requirement Documents & Screenshots. Automatically generate manual test cases, bug report templates, and a complete Requirement Coverage Matrix using local and cloud AI.",
};

export default function RootLayout({
 children,
}: Readonly<{
 children: React.ReactNode;
}>) {
 return (
  <html lang="en" className={`${inter.variable} h-full`}>
   <body className="min-h-full flex flex-col bg-background text-foreground antialiased font-sans transition-colors duration-300">
    <ThemeInit />
    {children}
   </body>
  </html>
 );
}
