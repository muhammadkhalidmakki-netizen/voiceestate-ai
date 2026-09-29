import type { Metadata } from "next";
import Hero from "../components/home/Hero";
import Navbar from "../components/home/Navbar";

export const metadata: Metadata = {
  title: "VoiceEstate AI | AI voice sales agent for real estate",
  description:
    "VoiceEstate AI calls new property enquiries, qualifies the buyer, matches Dubai projects, updates your CRM and hands ready buyers to a human closer.",
};

export default function HomePage() {
  return (
    <div className="home">
      <Navbar />
      <main>
        <Hero />
      </main>
    </div>
  );
}
