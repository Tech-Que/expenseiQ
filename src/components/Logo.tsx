interface LogoProps {
  variant?: "mark" | "full";
  /** Pixel height. Width is derived from the variant's aspect ratio. */
  size?: number;
  className?: string;
}

// Intrinsic dimensions of the source files in /public.
// logo-mark.png  — 512x512 (1:1)
// logo-full.png  — 895x790
const FULL_ASPECT_RATIO = 895 / 790;

/**
 * Plain <img> rather than next/image. The PNGs in /public are small enough
 * that the optimization payoff is marginal, and next/image's on-demand
 * optimization was failing on Vercel for logo-full.png (432 KB), leaving an
 * empty slot on /login. Plain <img> avoids that failure mode entirely.
 */
export default function Logo({ variant = "mark", size = 32, className }: LogoProps) {
  const isFull = variant === "full";
  const height = size;
  const width = isFull ? Math.round(size * FULL_ASPECT_RATIO) : size;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={isFull ? "/logo-full.png" : "/logo-mark.png"}
      alt={isFull ? "ExpenseIQ" : "ExpenseIQ logo"}
      width={width}
      height={height}
      className={className}
    />
  );
}
