export function Logo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" aria-label="botscript">
      <text
        x="40"
        y="135"
        textAnchor="middle"
        fontSize="140"
        fontWeight={500}
        fontFamily="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
        fill="#0D9488"
      >
        {"{"}
      </text>
      <text
        x="160"
        y="135"
        textAnchor="middle"
        fontSize="140"
        fontWeight={500}
        fontFamily="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
        fill="#0D9488"
      >
        {"}"}
      </text>
      <circle cx="86" cy="80" r="8" fill="#0D9488" />
      <circle cx="114" cy="80" r="8" fill="#0D9488" />
      <rect x="86" y="110" width="28" height="6" rx="3" fill="#0D9488" />
    </svg>
  );
}
