import Image from "next/image";
import Link from "next/link";

type LogoProps = {
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "pilot" | "seal";
  linked?: boolean;
  priority?: boolean;
  className?: string;
};

const pilotSizes = {
  sm: "h-8 w-auto",
  md: "h-12 w-auto sm:h-14",
  lg: "h-20 w-auto sm:h-24",
  xl: "h-28 w-auto sm:h-36",
};

const pilotDims = {
  sm: 240,
  md: 480,
  lg: 900,
  xl: 1200,
};

const sealSizes = {
  sm: "h-10 w-auto",
  md: "h-14 w-auto",
  lg: "h-28 w-auto",
  xl: "h-52 w-auto sm:h-64",
};

const sealDims = {
  sm: 64,
  md: 88,
  lg: 180,
  xl: 320,
};

export function Logo({
  size = "md",
  variant = "seal",
  linked = true,
  priority = false,
  className = "",
}: LogoProps) {
  const pilot = variant === "pilot";
  const width = pilot ? pilotDims[size] : sealDims[size];
  const height = pilot
    ? Math.round((width * 533) / 1600)
    : Math.round((width * 1132) / 1280);
  const image = (
    <Image
      src={pilot ? `/brand/varsity-pilot-${size === "sm" ? 480 : size === "md" ? 480 : 900}.webp` : "/brand/department-seal-400.webp"}
      alt={
        pilot
          ? "The Varsity Pilot — Online Newspaper of the University of Liberia Department of Communication and Media Studies"
          : "University of Liberia Department of Communication and Media Studies seal"
      }
      width={width}
      height={height}
      priority={priority}
      className={`${pilot ? pilotSizes[size] : sealSizes[size]} object-contain ${className}`}
    />
  );
  if (!linked) return image;
  return (
    <Link href="/" className="inline-flex items-center" aria-label="The Varsity Pilot home">
      {image}
    </Link>
  );
}
