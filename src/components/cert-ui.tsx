export function OrnamentalDivider({ color = "#C9A227" }: { color?: string }) {
  return (
    <div className="flex items-center gap-2 my-3">
      <div className="flex-1 h-px" style={{ backgroundColor: `${color}30` }} />
      <span style={{ color: `${color}65`, fontSize: 8, lineHeight: 1 }}>◆</span>
      <div className="flex-1 h-px" style={{ backgroundColor: `${color}30` }} />
    </div>
  );
}

export function CertStamp({ color, text, sub }: { color: string; text: string; sub: string }) {
  return (
    <div
      className="flex flex-col items-center gap-0.5 px-3 py-1.5"
      style={{ border: `3px double ${color}`, opacity: 0.55, transform: "rotate(-13deg)" }}
    >
      <p style={{ fontSize: 14, fontWeight: 900, color, letterSpacing: "0.18em", lineHeight: 1 }}>{text}</p>
      <div style={{ width: "100%", height: 1, backgroundColor: color, opacity: 0.5 }} />
      <p style={{ fontSize: 7, fontWeight: 700, color, letterSpacing: "0.25em" }}>{sub}</p>
    </div>
  );
}

export function CertSeal({
  color, line1, line2, rotate = -15,
}: {
  color: string; line1: string; line2: string; rotate?: number;
}) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-0.5"
      style={{
        width: 56, height: 56, borderRadius: "50%",
        border: `2px double ${color}`, opacity: 0.5,
        transform: `rotate(${rotate}deg)`,
      }}
    >
      <span style={{ fontSize: 7, fontWeight: 900, color, letterSpacing: "0.15em", lineHeight: 1 }}>{line1}</span>
      <div style={{ width: 28, height: 1, backgroundColor: color, opacity: 0.6 }} />
      <span style={{ fontSize: 6, fontWeight: 700, color, letterSpacing: "0.08em" }}>{line2}</span>
    </div>
  );
}
