import Image from "next/image";
import Link from "next/link";

const LINKS = [
  { label: "How It Works", href: "#how-it-works" },
  { label: "Technology", href: "#technology" },
  { label: "Live Demo", href: "/demo" },
];

const linkClass =
  "rounded-full px-4 py-2 text-[15px] text-muted transition-colors hover:bg-surface hover:text-foreground";

export default function Navbar() {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background">
      <div className="mx-auto flex h-20 w-full max-w-6xl items-center justify-between px-5 sm:px-8">
        <Link href="/" aria-label="VoiceEstate AI home" className="shrink-0">
          <Image
            src="/assets/logo-cropped.png"
            alt="VoiceEstate AI"
            width={1782}
            height={340}
            priority
            className="h-8 w-auto sm:h-11"
          />
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <Link key={l.label} href={l.href} className={linkClass}>
              {l.label}
            </Link>
          ))}
        </nav>

        <Link
          href="/demo"
          className="shrink-0 whitespace-nowrap rounded-full bg-foreground px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-black sm:px-5 sm:py-2.5 sm:text-[15px]"
        >
          Try Live Demo <span aria-hidden="true">→</span>
        </Link>
      </div>

      {/* phones: the same links, one quiet row under the bar */}
      <nav
        aria-label="Main (mobile)"
        className="flex gap-1 overflow-x-auto px-4 pb-3 md:hidden"
      >
        {LINKS.map((l) => (
          <Link key={l.label} href={l.href} className={`${linkClass} whitespace-nowrap`}>
            {l.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
