import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Providers from "./providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ReviewPilot | AI-Powered Pull Request Reviews",
  description: "A production-grade developer platform that uses LangGraph multi-agent systems to automatically review pull requests on GitHub.",
  keywords: ["AI", "PR Review", "LangGraph", "GitHub", "Next.js", "Express.js", "Gemini", "Software Quality"],
  authors: [{ name: "ReviewPilot Team" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} dark h-full antialiased`}
      style={{ colorScheme: "dark" }}
    >
      <body className="min-h-full bg-background text-foreground font-sans flex flex-col">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
