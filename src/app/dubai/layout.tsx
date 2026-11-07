import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import { cookies } from "next/headers";
import styles from "@/components/market-planning/market-planning.module.css";

// Font is loaded for this area only; the rest of the site keeps its own fonts.
const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope", display: "swap" });

// Isolated shell for the Dubai Real Estate Market Planning area. All design
// tokens are defined on this wrapper, so nothing leaks to the rest of the app.
export const metadata: Metadata = {
  title: "Dubai Real Estate Market Planning",
  description: "Plan your Dubai real estate buyer acquisition strategy across international markets.",
  robots: { index: false, follow: false },
};

export default async function DubaiLayout({ children }: { children: React.ReactNode }) {
  // The theme choice is stored in a cookie, so the server renders the right
  // theme on the first paint. With no choice, CSS follows the system setting.
  const saved = (await cookies()).get("mp_theme")?.value;
  const theme = saved === "light" || saved === "dark" ? saved : undefined;
  return (
    <div className={`${styles.root} ${manrope.variable}`} data-theme={theme} data-mp-root="">
      {children}
    </div>
  );
}
