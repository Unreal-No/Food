"use client";
// ตัวช่วยฝั่ง browser ใช้กับ useSyncExternalStore
let webgl: boolean | null = null;
export function hasWebGL() {
  if (webgl === null) {
    try { webgl = !!document.createElement("canvas").getContext("webgl2"); } catch { webgl = false; }
  }
  return webgl;
}
export const noopSubscribe = () => () => {};

const HASH_EVT = "vs-hash";
export const subscribeHash = (cb: () => void) => {
  window.addEventListener("hashchange", cb); window.addEventListener(HASH_EVT, cb);
  return () => { window.removeEventListener("hashchange", cb); window.removeEventListener(HASH_EVT, cb); };
};
export const getHash = () => location.hash;
export function clearHash() {
  history.replaceState(history.state, "", location.pathname + location.search);
  window.dispatchEvent(new Event(HASH_EVT));
}
