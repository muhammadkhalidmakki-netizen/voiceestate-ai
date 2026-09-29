import Image from "next/image";
import Link from "next/link";

const REPO_URL = "https://github.com/muhammadkhalidmakki-netizen/voiceestate-ai";

// In-page links; HashScroll makes them scroll every time they are clicked.
const LINKS = [
  { label: "How It Works", href: "#how-it-works" },
  { label: "Technology", href: "#technology" },
  { label: "Live Demo", href: "#live-demo" },
];

const linkClass =
  "text-[14px] text-muted transition-colors hover:text-foreground";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-background">
      <div className="mx-auto w-full max-w-6xl px-5 py-9 sm:px-8 sm:py-10">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="max-w-[22rem]">
            <Link href="/" aria-label="VoiceEstate AI home" className="inline-block">
              <Image
                src="/assets/logo-cropped.png"
                alt="VoiceEstate AI"
                width={1782}
                height={340}
                sizes="147px"
                className="h-7 w-auto"
              />
            </Link>
            <p className="m-0 mt-3 text-[14px] leading-relaxed text-muted">
              An AI voice sales agent that calls, qualifies and follows up on
              property enquiries.
            </p>
          </div>

          <nav aria-label="Footer">
            <ul className="m-0 grid list-none grid-cols-2 gap-x-7 gap-y-3 p-0 md:flex md:flex-wrap">
              {LINKS.map((l) => (
                <li key={l.label}>
                  <Link href={l.href} className={linkClass}>
                    {l.label}
                  </Link>
                </li>
              ))}
              <li>
                <a
                  href={REPO_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${linkClass} inline-flex items-center gap-1`}
                >
                  GitHub
                  <span aria-hidden="true" className="text-xs">
                    ↗
                  </span>
                  <span className="sr-only">(opens in a new tab)</span>
                </a>
              </li>
            </ul>
          </nav>
        </div>

        <div className="mt-7 flex flex-col gap-1.5 border-t border-border pt-5 text-[13px] text-muted sm:flex-row sm:items-center sm:justify-between">
          <p className="m-0">&copy; {year} VoiceEstate AI</p>
          <p className="m-0">
            Real-time speech powered by{" "}
            <span className="font-semibold text-foreground">AssemblyAI</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
