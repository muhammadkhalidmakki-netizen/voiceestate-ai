import Image from "next/image";

export default function Header() {
  return (
    <header className="border-b border-border bg-background">
      <div className="mx-auto flex h-20 w-full max-w-5xl items-center justify-between px-5 sm:px-8">
        <Image
          src="/assets/logo-cropped.png"
          alt="VoiceEstate AI"
          width={1782}
          height={340}
          priority
          className="h-9 w-auto sm:h-11"
        />
        <span className="hidden rounded-full border border-border px-4 py-1.5 text-sm text-muted sm:inline-block">
          AI Voice Agent Demo
        </span>
      </div>
    </header>
  );
}
