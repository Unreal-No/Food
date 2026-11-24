"use client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** ฟัง SSE แล้ว refresh ข้อมูลหน้า · fallback = poll เผื่อเครือข่ายตัด SSE */
export function LiveRefresh({ url, fallbackMs = 30_000, onEvent }: { url: string; fallbackMs?: number; onEvent?: (e: { status?: string }) => void }) {
  const router = useRouter();
  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | undefined;
    const es = new EventSource(url);
    const refresh = () => { clearTimeout(t); t = setTimeout(() => router.refresh(), 150); };
    // เชื่อมต่อ/ต่อใหม่สำเร็จ → refresh กันพลาด event ที่เกิดก่อนเชื่อมต่อหรือระหว่างหลุด
    es.onopen = refresh;
    es.onmessage = (m) => {
      try { onEvent?.(JSON.parse(m.data)); } catch { /* ข้าม payload เสีย */ }
      refresh();
    };
    const poll = setInterval(() => router.refresh(), fallbackMs);
    return () => { es.close(); clearInterval(poll); clearTimeout(t); };
  }, [url, fallbackMs, router, onEvent]);
  return null;
}
