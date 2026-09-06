export function BrandScreen({ message }: { message?: string }) {
  return (
    <div className="bg-bg px-6 pt-16 pb-10">
      <p className="font-display text-5xl text-fg">RadiusMeet</p>
      <p className="mt-2 max-w-xs text-muted">
        {message ?? "Meet in text. Meet on video. Free to start."}
      </p>
    </div>
  );
}
