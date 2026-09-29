import type { Metadata } from "next";
import Footer from "../components/home/Footer";
import HashScroll from "../components/home/HashScroll";
import Hero from "../components/home/Hero";
import HowItWorks from "../components/home/HowItWorks";
import LiveDemo from "../components/home/LiveDemo";
import Navbar from "../components/home/Navbar";
import Technology from "../components/home/Technology";

export const metadata: Metadata = {
  title: "VoiceEstate AI | AI voice sales agent for real estate",
  description:
    "VoiceEstate AI calls new property enquiries, qualifies the buyer, matches Dubai projects, updates your CRM and hands ready buyers to a human closer.",
};

export default function HomePage() {
  return (
    <div className="home">
      <HashScroll />
      <Navbar />
      <main>
        <Hero />
        <HowItWorks />
        <Technology />
        <LiveDemo />
      </main>
      <Footer />
    </div>
  );
}
