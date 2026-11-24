"use client";

/* ---------- ภาพสินค้า (placeholder จนกว่าจะมี 3D ใน P1) ---------- */
export function ProductStage({ emoji, size = "md", bump, image }: { emoji: string; size?: "sm" | "md" | "lg"; bump?: string; image?: string }) {
  const text = { sm: "text-3xl", md: "text-7xl", lg: "text-[9rem]" }[size];
  return (
    <div className="relative grid aspect-square place-items-center overflow-hidden rounded-[inherit] bg-[radial-gradient(circle_at_50%_38%,color-mix(in_oklab,var(--c-accent)_55%,transparent),transparent_65%),linear-gradient(160deg,color-mix(in_oklab,var(--c-accent)_18%,var(--c-surface)),color-mix(in_oklab,var(--c-primary)_12%,var(--c-surface)))]">
      <span className="absolute bottom-[16%] h-[8%] w-[46%] rounded-[50%] bg-black/25 blur-md" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {image ? <img src={image} alt="" loading="lazy" className="relative size-full object-contain p-2 transition-transform duration-500 group-hover:scale-105" /> : <span key={bump} className={`${text} relative select-none drop-shadow-[0_18px_18px_rgba(0,0,0,0.25)] transition-transform duration-500 group-hover:scale-110 ${size === "lg" ? "animate-float" : ""}`}>
        {emoji}
      </span>}
    </div>
  );
}

