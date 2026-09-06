import { cn } from "@/lib/utils";

export function Portrait({
  name,
  photo,
  hue,
  className,
}: {
  name: string;
  photo?: string | null;
  hue?: number;
  className?: string;
}) {
  if (photo) {
    return (
      <img
        src={photo}
        alt=""
        className={cn("h-full w-full object-cover", className)}
      />
    );
  }
  const h = hue ?? (name.charCodeAt(0) * 17) % 360;
  const initial = name.slice(0, 1).toUpperCase();
  return (
    <div
      className={cn("grid h-full w-full place-items-center", className)}
      style={{
        background: `radial-gradient(circle at 30% 20%, hsl(${h} 45% 42%), hsl(${h} 40% 16%))`,
      }}
    >
      <span className="font-display text-5xl text-primary-fg/90">{initial}</span>
    </div>
  );
}
