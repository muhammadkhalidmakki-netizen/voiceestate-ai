"use client";

/** Meta's infinity mark, drawn as a stroke so it stays crisp at any size. */
export function MetaLogo({ size = 18, white = false }: { size?: number; white?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
      <path
        d="M6.2 16.2c-2 0-3.2-1.8-3.2-4.2S4.2 7.8 6.2 7.8c3.6 0 7.6 8.4 11.6 8.4 2 0 3.2-1.8 3.2-4.2s-1.2-4.2-3.2-4.2c-4 0-8 8.4-11.6 8.4z"
        stroke={white ? "#ffffff" : "#0866FF"}
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Google "G" in its four brand colours. */
export function GoogleLogo({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path fill="#4285F4" d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.46a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.58-5.17 3.58-8.81z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.88-3a7.2 7.2 0 0 1-10.7-3.77H1.34v3.09A12 12 0 0 0 12 24z" />
      <path fill="#FBBC05" d="M5.36 14.32a7.2 7.2 0 0 1 0-4.64V6.59H1.34a12 12 0 0 0 0 10.82l4.02-3.09z" />
      <path fill="#EA4335" d="M12 4.75c1.76 0 3.34.6 4.58 1.79l3.44-3.44A11.97 11.97 0 0 0 12 0 12 12 0 0 0 1.34 6.59l4.02 3.09A7.2 7.2 0 0 1 12 4.75z" />
    </svg>
  );
}
