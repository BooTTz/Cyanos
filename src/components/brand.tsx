export const BrandMark = ({ size = 36 }: { size?: number }) => (
  <span
    className="bg-brand-gradient inline-flex shrink-0 items-center justify-center rounded-[0.7rem] shadow-lg"
    style={{ height: size, width: size, boxShadow: "0 4px 18px var(--glow-purple)" }}
  >
    <svg fill="none" height={size * 0.58} viewBox="0 0 24 24" width={size * 0.58}>
      <path
        d="M12 2.6 20.4 7.3v9.4L12 21.4 3.6 16.7V7.3L12 2.6Z"
        fill="white"
        fillOpacity="0.16"
        stroke="white"
        strokeWidth="1.3"
      />
      <path d="m8.4 14.4 3.6-6 3.6 6-3.6 2-3.6-2Z" fill="white" />
    </svg>
  </span>
);

export const Brand = ({
  compact = false,
  size = 36,
}: {
  compact?: boolean;
  size?: number;
}) => (
  <div className="flex items-center gap-2.5">
    <BrandMark size={size} />
    {!compact && (
      <div className="leading-none">
        <p className="text-foreground text-[19px] font-bold tracking-tight">Cyanos</p>
        <p className="text-muted text-[10px] font-medium tracking-[0.18em] uppercase">platform</p>
      </div>
    )}
  </div>
);
