"use client";
import { Suspense, useMemo, useRef, useState, useSyncExternalStore, type MutableRefObject, type RefObject } from "react";
import { Canvas, useFrame, type ThreeElements, type ThreeEvent } from "@react-three/fiber";
import { Billboard, ContactShadows, Environment, Lightformer, PerformanceMonitor } from "@react-three/drei";
import * as THREE from "three";
import type { Media, ShopTheme } from "@/db/schema";
import type { Fixture, Layout, V3 } from "@/lib/scene";
import { activeParts, presetParams } from "@/lib/presets";
import { resolveVisual } from "@/lib/visual";
import { MODELS } from "./models";
import { Glb } from "./Viewer3D";

export type SceneProduct = { id: string; name: string; emoji: string; price: string; media?: Media; soldout?: boolean };
export type Look = { yaw: number; pitch: number };
type Props = {
  layout: Layout; wall: string; floor: string; theme: ShopTheme; shopName: string; open: boolean;
  slots: (SceneProduct | null)[]; progress: number; look: MutableRefObject<Look>;
  onSelect?: (id: string) => void; paused?: boolean; highlight?: number; labelRef?: RefObject<HTMLDivElement | null>;
};

const PI = Math.PI;

/* ---------- ข้อความ/ป้าย = CanvasTexture (ไม่ใช้ DOM ซ้อนใน Canvas) ---------- */
const subFonts = (cb: () => void) => { document.fonts?.addEventListener("loadingdone", cb); return () => document.fonts?.removeEventListener("loadingdone", cb); };
const fontFamily = (v: string) => getComputedStyle(document.body).getPropertyValue(v).trim() || "sans-serif";
function useCanvasTexture(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void, key: string) {
  const ready = useSyncExternalStore(subFonts, () => document.fonts?.status === "loaded", () => false);
  return useMemo(() => {
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    draw(c.getContext("2d")!);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
    return t;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [w, h, key, ready]);
}
function TextPlane({ size, px, draw, k, ...rest }: { size: [number, number]; px: number; draw: (g: CanvasRenderingContext2D, w: number, h: number) => void; k: string } & ThreeElements["mesh"]) {
  const w = Math.round(size[0] * px), h = Math.round(size[1] * px);
  const map = useCanvasTexture(w, h, (g) => draw(g, w, h), k);
  return <mesh {...rest}><planeGeometry args={size} /><meshStandardMaterial map={map} transparent roughness={0.8} /></mesh>;
}
type Hover = { product: SceneProduct | null; pos: THREE.Vector3 };
const shade = (hex: string, k: number) => `#${new THREE.Color(hex).multiplyScalar(k).getHexString()}`;
const V = (v: V3) => new THREE.Vector3(...v);

/* ---------- ห้อง ---------- */
function useWoodTexture(color: string) {
  return useMemo(() => {
    const c = document.createElement("canvas"); c.width = c.height = 512;
    const g = c.getContext("2d")!, base = new THREE.Color(color);
    for (let i = 0; i < 16; i++) {
      const k = 0.88 + ((i * 37) % 11) / 45;
      g.fillStyle = `#${base.clone().multiplyScalar(k).getHexString()}`; g.fillRect(0, i * 32, 512, 32);
      g.fillStyle = "rgba(0,0,0,.18)"; g.fillRect(0, i * 32, 512, 1.5); g.fillRect(((i * 173) % 400) + 40, i * 32, 1.5, 32);
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 3); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
    return t;
  }, [color]);
}

function Room({ wall, floor, theme, shopName, open, doorRef }: { wall: string; floor: string; theme: ShopTheme; shopName: string; open: boolean; doorRef: MutableRefObject<number> }) {
  const wood = useWoodTexture(floor);
  const left = useRef<THREE.Group>(null), right = useRef<THREE.Group>(null);
  useFrame(() => { const a = doorRef.current * PI * 0.45; left.current?.rotation.set(0, a, 0); right.current?.rotation.set(0, -a, 0); });
  const wallMat = <meshStandardMaterial color={wall} roughness={0.95} />;
  const glass = <meshPhysicalMaterial color="#dbeafe" roughness={0.05} transparent opacity={0.18} depthWrite={false} side={THREE.DoubleSide} />;
  const frame = <meshStandardMaterial color={shade(theme.primary, 0.7)} roughness={0.5} />;
  return (
    <group>
      <mesh rotation-x={-PI / 2} position={[0, -0.02, 6]}><planeGeometry args={[40, 30]} /><meshStandardMaterial color="#bdb6aa" roughness={1} /></mesh>
      <mesh rotation-x={-PI / 2}><planeGeometry args={[10, 8]} /><meshStandardMaterial map={wood} roughness={0.65} /></mesh>
      <mesh position={[0, 3.2, 0]} rotation-x={PI / 2}><planeGeometry args={[10, 8]} /><meshStandardMaterial color={shade(wall, 1.05)} roughness={1} /></mesh>
      <mesh position={[0, 1.6, -4]}><planeGeometry args={[10, 3.2]} />{wallMat}</mesh>
      <mesh position={[-5, 1.6, 0]} rotation-y={PI / 2}><planeGeometry args={[8, 3.2]} />{wallMat}</mesh>
      <mesh position={[5, 1.6, 0]} rotation-y={-PI / 2}><planeGeometry args={[8, 3.2]} />{wallMat}</mesh>
      {/* หน้าร้าน: กระจกบานใหญ่ + กรอบ + กันสาด + ป้าย */}
      {[-1, 1].map((sd) => (
        <group key={sd} position={[sd * 2.9, 0, 4]}>
          <mesh position-y={0.3}><boxGeometry args={[4.2, 0.6, 0.15]} />{frame}</mesh>
          <mesh position-y={1.6}><planeGeometry args={[4.2, 2]} />{glass}</mesh>
          <mesh position-y={2.9}><boxGeometry args={[4.2, 0.6, 0.15]} />{frame}</mesh>
        </group>
      ))}
      <mesh position={[0, 2.75, 4]}><boxGeometry args={[1.6, 0.9, 0.15]} />{frame}</mesh>
      <mesh position={[0, 2.5, 4.6]} rotation-x={0.35}><boxGeometry args={[10.4, 0.06, 1.3]} /><meshStandardMaterial color={theme.primary} roughness={0.6} /></mesh>
      <mesh position={[0, 2.12, 5.21]}><boxGeometry args={[10.4, 0.42, 0.05]} /><meshStandardMaterial color={shade(theme.primary, 0.8)} roughness={0.6} /></mesh>
      <TextPlane position={[0, 2.12, 5.24]} size={[6, 0.4]} px={160} k={shopName + theme.surface} draw={(g, w, h) => {
        g.fillStyle = theme.surface; g.textAlign = "center"; g.textBaseline = "middle";
        g.font = `700 ${h * 0.62}px ${fontFamily("--font-display-active") || fontFamily("--font-modern")}`; g.fillText(shopName, w / 2, h / 2 + 2);
      }} />
      {[[-0.8, left, 1], [0.8, right, -1]].map(([x, ref, sd]) => (
        <group key={x as number} position={[x as number, 0, 4]} ref={ref as React.RefObject<THREE.Group>}>
          <mesh position={[(sd as number) * 0.4, 1.15, 0]}><boxGeometry args={[0.8, 2.3, 0.04]} /><meshPhysicalMaterial color="#e0f2fe" roughness={0.05} transparent opacity={0.3} /></mesh>
          <mesh position={[(sd as number) * 0.68, 1.1, 0.05]}><boxGeometry args={[0.03, 0.5, 0.03]} /><meshStandardMaterial color="#d4d4d4" metalness={0.8} roughness={0.25} /></mesh>
        </group>
      ))}
      {!open && (
        <TextPlane position={[0, 1.7, 4.1]} size={[0.9, 0.3]} px={300} k="closed" draw={(g, w, h) => {
          g.fillStyle = "#b91c1c"; g.beginPath(); g.roundRect(0, 0, w, h, 24); g.fill();
          g.fillStyle = "#fff"; g.textAlign = "center"; g.textBaseline = "middle"; g.font = `700 ${h * 0.55}px sans-serif`; g.fillText("CLOSED", w / 2, h / 2 + 3);
        }} />
      )}
    </group>
  );
}

/* ---------- เฟอร์นิเจอร์ ---------- */
function FixtureMesh({ f, theme, wall, items }: { f: Fixture; theme: ShopTheme; wall: string; items: SceneProduct[] }) {
  const w = f.w ?? 1, wood = shade(theme.primary, 0.85), stone = "#ece7df";
  const glass = <meshPhysicalMaterial color="#e0f2fe" roughness={0.05} transparent opacity={0.22} depthWrite={false} />;
  const body = (() => {
    switch (f.kind) {
      case "counter": return (<>
        <mesh position-y={0.5}><boxGeometry args={[w, 1, 0.75]} /><meshStandardMaterial color={wood} roughness={0.6} /></mesh>
        <mesh position-y={1.025}><boxGeometry args={[w + 0.1, 0.05, 0.85]} /><meshStandardMaterial color={stone} roughness={0.3} /></mesh>
      </>);
      case "case": return (<>
        <mesh position-y={0.15}><boxGeometry args={[w, 0.3, 0.75]} /><meshStandardMaterial color={wood} roughness={0.6} /></mesh>
        {[0.42, 0.87].map((y) => <mesh key={y} position-y={y}><boxGeometry args={[w - 0.05, 0.02, 0.68]} /><meshStandardMaterial color="#f8fafc" roughness={0.2} /></mesh>)}
        <mesh position-y={0.75}><boxGeometry args={[w, 0.9, 0.72]} />{glass}</mesh>
        <pointLight position={[0, 1.1, 0]} intensity={0.6} distance={1.6} color="#fff4d6" />
      </>);
      case "shelf": case "fridge": {
        const fridge = f.kind === "fridge", levels = fridge ? [1.0, 1.55] : [0.54, 1.08, 1.62];
        return (<>
          <mesh position={[0, 1.05, -0.2]}><boxGeometry args={[w, 2.1, 0.04]} /><meshStandardMaterial color={fridge ? "#e5e7eb" : shade(wall, 0.8)} /></mesh>
          {[-1, 1].map((s) => <mesh key={s} position={[(s * w) / 2, 1.05, 0]}><boxGeometry args={[0.04, 2.1, 0.44]} /><meshStandardMaterial color={fridge ? "#d1d5db" : wood} /></mesh>)}
          {levels.map((y) => <mesh key={y} position={[0, y - 0.015, 0]}><boxGeometry args={[w, 0.03, 0.42]} /><meshStandardMaterial color={fridge ? "#f1f5f9" : wood} roughness={0.5} /></mesh>)}
          {fridge && <mesh position={[0, 1.05, 0.22]}><boxGeometry args={[w, 2.1, 0.02]} />{glass}</mesh>}
          {fridge && <pointLight position={[0, 1.9, 0.1]} intensity={0.8} distance={2.5} color="#dbeafe" />}
        </>);
      }
      case "table": return (<>
        <mesh position-y={0.735}><cylinderGeometry args={[0.45, 0.45, 0.04, 40]} /><meshStandardMaterial color={stone} roughness={0.35} /></mesh>
        <mesh position-y={0.37}><cylinderGeometry args={[0.04, 0.04, 0.72, 12]} /><meshStandardMaterial color="#27272a" metalness={0.6} roughness={0.4} /></mesh>
        <mesh position-y={0.01}><cylinderGeometry args={[0.25, 0.25, 0.02, 24]} /><meshStandardMaterial color="#27272a" /></mesh>
        {[0, PI].map((a) => (
          <group key={a} rotation-y={a} position={[Math.sin(a) * 0.62, 0, Math.cos(a) * 0.62]}>
            <mesh position-y={0.45}><boxGeometry args={[0.42, 0.05, 0.42]} /><meshStandardMaterial color={wood} /></mesh>
            <mesh position={[0, 0.72, 0.19]}><boxGeometry args={[0.42, 0.5, 0.04]} /><meshStandardMaterial color={wood} /></mesh>
            <mesh position-y={0.22}><cylinderGeometry args={[0.03, 0.03, 0.44, 8]} /><meshStandardMaterial color="#27272a" /></mesh>
          </group>
        ))}
      </>);
      case "plant": return (<>
        <mesh position-y={0.25}><cylinderGeometry args={[0.24, 0.18, 0.5, 20]} /><meshStandardMaterial color="#b4643c" roughness={0.9} /></mesh>
        {[[0, 0.85, 0, 0.38], [0.18, 1.15, 0.05, 0.28], [-0.15, 1.1, -0.1, 0.3], [0, 1.4, 0, 0.22]].map(([x, y, z, r], i) => (
          <mesh key={i} position={[x, y, z]}><icosahedronGeometry args={[r, 1]} /><meshStandardMaterial color={i % 2 ? "#3f7d3a" : "#4d8f45"} flatShading roughness={0.8} /></mesh>
        ))}
      </>);
      case "pendant": return (<>
        <mesh position-y={(3.2 - f.p[1]) / 2}><cylinderGeometry args={[0.008, 0.008, 3.2 - f.p[1], 6]} /><meshBasicMaterial color="#111" /></mesh>
        <mesh><coneGeometry args={[0.22, 0.24, 24, 1, true]} /><meshStandardMaterial color={theme.primary} side={THREE.DoubleSide} roughness={0.5} /></mesh>
        <mesh position-y={-0.1}><sphereGeometry args={[0.07, 16, 16]} /><meshStandardMaterial emissive="#ffd9a0" emissiveIntensity={3} color="#fff" /></mesh>
      </>);
      case "board": return (<>
        <mesh><boxGeometry args={[2.6, 1.15, 0.05]} /><meshStandardMaterial color="#1f2421" roughness={0.9} /></mesh>
        <TextPlane position={[0, 0, 0.03]} size={[2.5, 1.05]} px={400} k={items.map((p) => p.name + p.price).join() + theme.accent} draw={(g, w, h) => {
          const body = fontFamily("--font-body");
          g.textBaseline = "middle"; g.fillStyle = theme.accent; g.textAlign = "center"; g.font = `700 ${h * 0.12}px ${body}`; g.fillText("M E N U", w / 2, h * 0.13);
          g.font = `500 ${h * 0.075}px ${body}`;
          items.slice(0, 10).forEach((p, i) => {
            const col = i % 2, row = Math.floor(i / 2), x0 = w * (0.06 + col * 0.48), x1 = x0 + w * 0.42, y = h * (0.32 + row * 0.14);
            g.fillStyle = "#f5f5f4"; g.textAlign = "left"; g.fillText(p.name, x0, y);
            g.fillStyle = "rgba(245,245,244,.7)"; g.textAlign = "right"; g.fillText(p.price, x1, y);
          });
        }} />
      </>);
      case "machine": return (<>
        <mesh position-y={0.28}><boxGeometry args={[0.62, 0.42, 0.45]} /><meshStandardMaterial color={theme.primary} roughness={0.35} metalness={0.3} /></mesh>
        <mesh position-y={0.52}><boxGeometry args={[0.64, 0.06, 0.47]} /><meshStandardMaterial color="#d4d4d8" metalness={0.9} roughness={0.2} /></mesh>
        <mesh position={[0, 0.03, 0.12]}><boxGeometry args={[0.6, 0.06, 0.26]} /><meshStandardMaterial color="#3f3f46" metalness={0.8} roughness={0.3} /></mesh>
        {[-0.15, 0.15].map((x) => (
          <group key={x} position={[x, 0.24, 0.27]}>
            <mesh><cylinderGeometry args={[0.045, 0.05, 0.05, 20]} /><meshStandardMaterial color="#d4d4d8" metalness={0.9} roughness={0.2} /></mesh>
            <mesh position={[0, -0.02, 0.1]} rotation-x={PI / 2}><cylinderGeometry args={[0.012, 0.012, 0.16, 8]} /><meshStandardMaterial color="#18181b" /></mesh>
          </group>
        ))}
      </>);
      case "stove": return (<>
        <mesh position-y={0.05}><boxGeometry args={[0.8, 0.1, 0.5]} /><meshStandardMaterial color="#3f3f46" metalness={0.7} roughness={0.35} /></mesh>
        <mesh position-y={0.22} rotation-x={PI}><sphereGeometry args={[0.28, 24, 12, 0, PI * 2, 0, PI / 2]} /><meshStandardMaterial color="#27272a" metalness={0.8} roughness={0.3} side={THREE.DoubleSide} /></mesh>
        <mesh position-y={0.11}><coneGeometry args={[0.12, 0.12, 16]} /><meshStandardMaterial color="#f97316" emissive="#ea580c" emissiveIntensity={2} /></mesh>
      </>);
      case "island": return (<>
        <mesh position-y={0.45}><boxGeometry args={[2.8, 0.9, 1.2]} /><meshStandardMaterial color={wood} roughness={0.6} /></mesh>
        <mesh position-y={0.92}><boxGeometry args={[2.9, 0.05, 1.3]} /><meshStandardMaterial color={stone} roughness={0.3} /></mesh>
      </>);
    }
  })();
  return <group position={f.p} rotation-y={f.r ?? 0}>{body}</group>;
}

/* ---------- สินค้าบนชั้น ---------- */
function Emoji({ emoji }: { emoji: string }) {
  const map = useCanvasTexture(128, 128, (g) => { g.textAlign = "center"; g.textBaseline = "middle"; g.font = "96px sans-serif"; g.fillText(emoji, 64, 70); }, emoji);
  return <Billboard position-y={0.22}><mesh><planeGeometry args={[0.26, 0.26]} /><meshBasicMaterial map={map} transparent /></mesh></Billboard>;
}

function ProductSpot({ product, at, onSelect, hoverRef }: { product: SceneProduct; at: V3; onSelect?: (id: string) => void; hoverRef: MutableRefObject<Hover> }) {
  const g = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (!g.current) return;
    const on = hoverRef.current.product === product && hoverRef.current.pos.x === at[0] && hoverRef.current.pos.z === at[2];
    g.current.position.y = THREE.MathUtils.damp(g.current.position.y, on ? 0.06 : 0, 8, dt);
    g.current.rotation.y += on ? dt * 1.2 : 0;
  });
  const m = product.media, r = resolveVisual(m, []);
  const model = m?.type === "preset" && MODELS[m.preset]
    ? (() => { const C = MODELS[m.preset]; return <group scale={0.12}><C p={presetParams(m.preset, r.params)} on={activeParts(m.preset, r.parts, r.hidden)} /></group>; })()
    : m?.type === "glb" ? <Suspense fallback={null}><group scale={0.14}><Glb url={m.url} r={r} /></group></Suspense>
    : <>
        <mesh position-y={0.04}><cylinderGeometry args={[0.13, 0.15, 0.08, 24]} /><meshStandardMaterial color="#f5f5f4" /></mesh>
        <Emoji emoji={product.emoji} />
      </>;
  const click = (e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); if (e.delta < 6 && !product.soldout) onSelect?.(product.id); };
  return (
    <group position={at}>
      <group ref={g}>{model}</group>
      <mesh position-y={0.18} onClick={click}
        onPointerOver={(e) => { e.stopPropagation(); hoverRef.current = { product, pos: new THREE.Vector3(...at) }; document.body.style.cursor = "pointer"; }}
        onPointerOut={() => { if (hoverRef.current.product === product) hoverRef.current = { product: null, pos: hoverRef.current.pos }; document.body.style.cursor = ""; }}>
        <boxGeometry args={[0.34, 0.4, 0.34]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
}

/** ป้ายชื่อ/ราคา: DOM overlay นอก Canvas ตามตำแหน่งสินค้าที่ชี้ (หรือช่องที่ไฮไลต์ในหลังบ้าน) */
function paintLabel(el: HTMLElement, show: boolean, x = 0, y = 0, text?: string) {
  el.style.opacity = show ? "1" : "0";
  if (show) el.style.transform = `translate(-50%,-100%) translate(${x}px, ${y}px)`;
  if (text !== undefined && el.textContent !== text) el.textContent = text;
}

function LabelTracker({ hoverRef, labelRef, fixed }: { hoverRef: MutableRefObject<Hover>; labelRef?: RefObject<HTMLDivElement | null>; fixed?: Hover }) {
  const pRef = useRef(new THREE.Vector3());
  useFrame(({ camera, size }) => {
    const el = labelRef?.current;
    if (!el) return;
    const h = hoverRef.current.product ? hoverRef.current : fixed;
    if (!h?.product) return paintLabel(el, false);
    const v = pRef.current.copy(h.pos).setY(h.pos.y + 0.5).project(camera);
    paintLabel(el, v.z < 1, ((v.x + 1) / 2) * size.width, ((1 - v.y) / 2) * size.height, `${h.product.name} · ${h.product.soldout ? "หมด" : h.product.price}`);
  });
  return null;
}

/* ---------- กล้องเดินตามโซน ---------- */
const smooth = (t: number) => t * t * (3 - 2 * t);
function fitFov(cam: THREE.PerspectiveCamera, fov: number) {
  if (cam.fov !== fov) { cam.fov = fov; cam.updateProjectionMatrix(); }
}
function Rig({ zones, progress, lookRef, doorRef }: { zones: Layout["zones"]; progress: number; lookRef: MutableRefObject<Look>; doorRef: MutableRefObject<number> }) {
  const st = useRef({ cur: progress, yaw: 0, pitch: 0, pos: new THREE.Vector3(), tgt: new THREE.Vector3(), dir: new THREE.Vector3() });
  const pts = useMemo(() => zones.map((z) => ({ pos: V(z.pos), look: V(z.look) })), [zones]);
  useFrame(({ camera, size }, dt) => {
    const s = st.current, L = lookRef.current, a = size.width / size.height;
    // จอแนวตั้ง (มือถือ) มุมกว้างขึ้น ให้เห็นทั้งเคาน์เตอร์/ชั้นวาง
    fitFov(camera as THREE.PerspectiveCamera, a < 0.8 ? 66 : a < 1.2 ? 60 : 55);
    s.cur = THREE.MathUtils.damp(s.cur, progress, 2.6, dt);
    const i = Math.min(Math.floor(s.cur), pts.length - 2), t = smooth(Math.min(1, s.cur - i));
    s.pos.lerpVectors(pts[i].pos, pts[i + 1].pos, t);
    s.tgt.lerpVectors(pts[i].look, pts[i + 1].look, t);
    s.yaw = THREE.MathUtils.damp(s.yaw, L.yaw, 6, dt);
    s.pitch = THREE.MathUtils.damp(s.pitch, L.pitch, 6, dt);
    s.dir.subVectors(s.tgt, s.pos).applyAxisAngle(THREE.Object3D.DEFAULT_UP, s.yaw);
    s.dir.y += s.pitch * s.dir.length();
    s.tgt.copy(s.pos).add(s.dir);
    // จอแนวตั้ง: ถอยกล้องออกตามแนวสายตา (fov ของ three เป็นแนวตั้ง จอแคบจึงเห็นด้านข้างน้อย)
    camera.position.copy(s.pos).addScaledVector(s.dir.normalize(), -(a < 1 ? (1 - a) * 2.2 : 0));
    camera.lookAt(s.tgt);
    doorRef.current = THREE.MathUtils.clamp((s.cur - 0.15) / 0.6, 0, 1);
  });
  return null;
}

export default function StoreScene(props: Props) {
  const { layout, wall, floor, theme, shopName, open, slots, progress, look, onSelect, paused, highlight, labelRef } = props;
  const hoverRef = useRef<Hover>({ product: null, pos: new THREE.Vector3() });
  const fixed = highlight !== undefined && layout.slots[highlight] ? { product: slots[highlight] ?? null, pos: V(layout.slots[highlight].p) } : undefined;
  const [dpr, setDpr] = useState(1.5);
  const doorRef = useRef(0);
  const items = [...new Map((slots.filter(Boolean) as SceneProduct[]).map((p) => [p.id, p])).values()];
  const sky = open ? "#dbe8f1" : "#1c2333";
  return (
    <Canvas dpr={dpr} frameloop={paused ? "never" : "always"} camera={{ fov: 55, near: 0.05, far: 60, position: layout.zones[0].pos }} gl={{ antialias: true }}>
      <PerformanceMonitor onDecline={() => setDpr(1)} />
      <color attach="background" args={[sky]} />
      <fog attach="fog" args={[sky, 14, 30]} />
      <ambientLight intensity={open ? 0.55 : 0.18} />
      <hemisphereLight args={["#fff7ed", shade(floor, 0.6), open ? 0.6 : 0.15]} />
      <directionalLight position={[2, 6, 8]} intensity={open ? 1.1 : 0.15} color={open ? "#fff3e0" : "#9db4ff"} />
      <Environment resolution={128} frames={1}>
        <Lightformer form="rect" intensity={open ? 1.6 : 0.4} position={[0, 4, 6]} scale={[10, 3, 1]} />
        <Lightformer form="rect" intensity={open ? 1.2 : 0.3} color="#ffe6c7" position={[0, 6, -2]} rotation-x={PI / 2} scale={[8, 6, 1]} />
      </Environment>
      {layout.fixtures.filter((f) => f.kind === "pendant").slice(0, 3).map((f, i) => (
        <pointLight key={i} position={[f.p[0], f.p[1] - 0.2, f.p[2]]} intensity={open ? 2.2 : 3} distance={4} decay={1.6} color="#ffd9a0" />
      ))}
      <Room wall={wall} floor={floor} theme={theme} shopName={shopName} open={open} doorRef={doorRef} />
      {layout.fixtures.map((f, i) => <FixtureMesh key={i} f={f} theme={theme} wall={wall} items={items} />)}
      {layout.slots.map((s, i) => slots[i] && (
        <ProductSpot key={`${i}-${slots[i]!.id}`} product={slots[i]!} at={s.p} onSelect={onSelect} hoverRef={hoverRef} />
      ))}
      <LabelTracker hoverRef={hoverRef} labelRef={labelRef} fixed={fixed} />
      {highlight !== undefined && layout.slots[highlight] && (
        <mesh rotation-x={-PI / 2} position={[layout.slots[highlight].p[0], layout.slots[highlight].p[1] + 0.005, layout.slots[highlight].p[2]]}>
          <ringGeometry args={[0.12, 0.17, 32]} /><meshBasicMaterial color="#22c55e" />
        </mesh>
      )}
      <ContactShadows frames={1} position-y={0.002} scale={[10, 8]} opacity={0.35} blur={2.5} far={2.5} resolution={512} />
      <Rig zones={layout.zones} progress={progress} lookRef={look} doorRef={doorRef} />
    </Canvas>
  );
}
