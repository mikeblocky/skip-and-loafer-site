/**
 * Shima's Santa hat (it turned up on his head the moment the ticket went through). Muted colours
 * and a soft brown line so it sits in the same world as the character art instead of popping off
 * it. Sized and placed in % of his picture, so it lands on his head wherever he is drawn.
 */
export function SantaHat({ className }: { className?: string }) {
  return (
    <svg className={`santa-hat${className ? ` ${className}` : ''}`} viewBox="0 0 100 80" aria-hidden="true">
      <path
        d="M14 62C17 36 33 13 58 9c15-2 28 6 31 19 1 5 0 9-2 12-4-8-12-12-20-10 8 9 15 20 18 32z"
        fill="#C2525C"
        stroke="#7A4A48"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M50 20c-7 8-12 20-14 34" fill="none" stroke="#A9434D" strokeWidth="2.4" strokeLinecap="round" />
      <rect x="6" y="55" width="88" height="17" rx="8.5" fill="#EFE8DE" stroke="#8C7468" strokeWidth="1.6" />
      <circle cx="87" cy="41" r="9" fill="#EFE8DE" stroke="#8C7468" strokeWidth="1.6" />
    </svg>
  )
}
