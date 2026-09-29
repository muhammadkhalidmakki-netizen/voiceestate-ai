import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import DevConsoleFilter from "../components/DevConsoleFilter";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "VoiceEstate AI",
  description: "Talk to an AI property consultant about Dubai real estate.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <DevConsoleFilter />
        {children}
      </body>
    </html>
  );
}
