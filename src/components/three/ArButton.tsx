"use client";
import { useState, useSyncExternalStore, type RefObject } from "react";
import * as THREE from "three";
import type { Media } from "@/db/schema";

// โมเดลในแอปใช้หน่วย ~2–3 = แก้ว/จานจริง ~12–18 ซม. → ย่อเป็นเมตรสำหรับ AR
const AR_SCALE = 0.06;
const noop = () => () => {};
const platform = () => (/iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  ? "ios" : /Android/.test(navigator.userAgent) ? "android" : "none");

/** วางสินค้าบนโต๊ะจริง: iOS = Quick Look (สร้าง USDZ ในเครื่อง) · Android = Scene Viewer (ต้องเป็นไฟล์ .glb) */
export function ArButton({ target, media, title }: { target: RefObject<THREE.Group | null>; media: Media; title: string }) {
  const os = useSyncExternalStore(noop, platform, () => "none");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  if (os === "none" || (os === "android" && media.type !== "glb")) return null;

  const open = async () => {
    setErr("");
    if (os === "android" && media.type === "glb") {
      const file = new URL(media.url, location.href).href;
      location.href = `intent://arvr.google.com/scene-viewer/1.2?file=${encodeURIComponent(file)}&mode=ar_preferred&title=${encodeURIComponent(title)}#Intent;scheme=https;package=com.google.android.googlequicksearchbox;action=android.intent.action.VIEW;S.browser_fallback_url=${encodeURIComponent(location.href)};end;`;
      return;
    }
    if (!target.current) return;
    setBusy(true);
    try {
      const { USDZExporter } = await import("three/examples/jsm/exporters/USDZExporter.js");
      const root = new THREE.Group();
      const copy = target.current.clone(true);
      copy.scale.multiplyScalar(AR_SCALE);
      root.add(copy);
      const buf = await new USDZExporter().parseAsync(root);
      const url = URL.createObjectURL(new Blob([buf as BlobPart], { type: "model/vnd.usdz+zip" }));
      const a = document.createElement("a");
      a.rel = "ar"; a.href = url;
      a.appendChild(document.createElement("img")); // Quick Look ต้องมี <img> ข้างใน
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (e) {
      setErr("เปิด AR ไม่ได้บนอุปกรณ์นี้");
      console.warn("[ar]", e);
    } finally { setBusy(false); }
  };

  return (
    <div className="absolute left-3 top-3 flex flex-col items-start gap-1">
      <button onClick={open} disabled={busy} className="rounded-full bg-ink/85 px-3 py-1.5 text-xs font-medium text-card shadow backdrop-blur disabled:opacity-60">
        {busy ? "กำลังเตรียม…" : "📱 วางบนโต๊ะจริง (AR)"}
      </button>
      {err && <span className="rounded-full bg-red-600/90 px-2 py-0.5 text-[11px] text-white">{err}</span>}
    </div>
  );
}
