"use client";
import dynamic from "next/dynamic";
import { Component, useSyncExternalStore, type ReactNode } from "react";
import type { Media } from "@/db/schema";
import type { Resolved } from "@/lib/visual";
import { ProductStage } from "@/components/store/ProductStage";
import { Turntable } from "./Turntable";

// three.js โหลดเฉพาะตอนเปิดดูสินค้า (ไม่ถ่วงหน้าแรก)
const Viewer3D = dynamic(() => import("@/components/three/Viewer3D"), { ssr: false });

let webgl: boolean | null = null;
function hasWebGL() {
  if (webgl === null) {
    try { webgl = !!document.createElement("canvas").getContext("webgl2"); } catch { webgl = false; }
  }
  return webgl;
}
const noop = () => () => {};

class Fallback extends Component<{ fallback: ReactNode; children: ReactNode }, { err: boolean }> {
  state = { err: false };
  static getDerivedStateFromError() { return { err: true }; }
  render() { return this.state.err ? this.props.fallback : this.props.children; }
}

/** สื่อสินค้า: 3D (preset/GLB) · ภาพหมุน 360° · รูป · หรือ emoji (fallback 2D) */
export function MediaView({ media, resolved, emoji, alt }: { media?: Media; resolved: Resolved; emoji: string; alt: string }) {
  const gl = useSyncExternalStore(noop, hasWebGL, () => false);
  const flat = <ProductStage emoji={emoji} size="lg" />;
  if (!media) return flat;
  if (media.type === "turntable") return <Turntable frames={media.frames} alt={alt} />;
  if (media.type === "photo") return <Turntable frames={[media.url]} alt={alt} />;
  if (!gl) return flat;
  return (
    <div className="relative size-full bg-[radial-gradient(circle_at_50%_40%,color-mix(in_oklab,var(--c-accent)_45%,transparent),transparent_70%),linear-gradient(160deg,color-mix(in_oklab,var(--c-accent)_15%,var(--c-surface)),color-mix(in_oklab,var(--c-primary)_10%,var(--c-surface)))]">
      <Fallback fallback={flat}><Viewer3D media={media} resolved={resolved} /></Fallback>
    </div>
  );
}
