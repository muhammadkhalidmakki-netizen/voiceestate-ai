"use client";

import { useState } from "react";
import m from "./settings.module.css";

/** Country flag from /public/flags (country-flag-icons, MIT). Falls back to the ISO code if a flag is missing. */
export default function Flag({ iso2, name, size = 20 }: { iso2: string; name?: string; size?: number }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <span className={m.flagCode}>{iso2}</span>;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className={m.flag}
      src={`/flags/${iso2.toLowerCase()}.svg`}
      alt=""
      title={name}
      width={size}
      height={Math.round((size * 2) / 3)}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}
