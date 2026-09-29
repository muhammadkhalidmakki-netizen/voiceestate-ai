import Image from "next/image";
import Link from "next/link";

export default function Header() {
  return (
    <header className="border-b border-border bg-background">
      <div className="mx-auto flex h-20 w-full max-w-6xl items-center justify-between px-5 sm:px-8">
        <Link href="/" aria-label="VoiceEstate AI home" className="shrink-0">
          <Image
            src="/assets/logo-cropped.png"
            alt="VoiceEstate AI"
            width={1782}
            height={340}
            priority
            sizes="(min-width: 640px) 231px, 168px"
            className="h-8 w-auto sm:h-11"
          />
        </Link>
        <div className="flex items-center gap-3 sm:gap-4">
          <span className="hidden rounded-full border border-border px-4 py-1.5 text-sm text-muted sm:inline-block">
            AI Voice Agent Demo
          </span>
          <Link
            href="/"
            className="text-[14px] font-medium text-foreground underline-offset-4 hover:underline"
          >
            <span aria-hidden="true">←</span> Back to home
          </Link>
        </div>
      </div>
    </header>
  );
}
