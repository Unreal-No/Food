import "server-only";
import { subscribe, type AppEvent } from "@/db";

/** Server-Sent Events จาก realtime bus · filter = เลือกเฉพาะ event ที่ผู้ฟังมีสิทธิ์เห็น */
export function sseResponse(req: Request, filter: (e: AppEvent) => boolean, map: (e: AppEvent) => unknown = (e) => e) {
  const enc = new TextEncoder();
  let cleanup = () => {};
  const stream = new ReadableStream({
    async start(ctrl) {
      let closed = false;
      const send = (s: string) => { if (!closed) try { ctrl.enqueue(enc.encode(s)); } catch { cleanup(); } };
      const unsub = await subscribe((e) => { if (filter(e)) send(`data: ${JSON.stringify(map(e))}\n\n`); });
      const ping = setInterval(() => send(": ping\n\n"), 25_000);
      cleanup = () => {
        if (closed) return;
        closed = true; clearInterval(ping); unsub();
        try { ctrl.close(); } catch { /* ปิดไปแล้ว */ }
      };
      req.signal.addEventListener("abort", cleanup);
      send("retry: 3000\n\n");
    },
    cancel() { cleanup(); },
  });
  return new Response(stream, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive" } });
}
