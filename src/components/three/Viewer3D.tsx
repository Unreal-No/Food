"use client";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Center, ContactShadows, Environment, Lightformer, OrbitControls, PerformanceMonitor, Resize, useGLTF } from "@react-three/drei";
import type { OrbitControls as OrbitImpl } from "three-stdlib";
import * as THREE from "three";
import type { Media } from "@/db/schema";
import type { Resolved } from "@/lib/visual";
import { activeParts, presetParams } from "@/lib/presets";
import { MODELS } from "./models";
import { ArButton } from "./ArButton";

/** GLB: node ชื่อขึ้นต้น "opt_" ซ่อนไว้จนกว่าจะถูก show · params จับคู่กับชื่อ material */
/** ใช้ material ของตัวเอง (ไม่แก้ตัวที่ cache ร่วมกัน) */
function own(o: THREE.Mesh) {
  const m = o.material as THREE.MeshStandardMaterial;
  if (!m.userData.cloned) { o.material = m.clone(); (o.material as THREE.Material).userData.cloned = true; }
  return o.material as THREE.MeshStandardMaterial;
}

export function Glb({ url, r, flat }: { url: string; r: Resolved; flat?: boolean }) {
  const { scene } = useGLTF(url, false, true);
  const root = useMemo(() => scene.clone(true), [scene]);
  useEffect(() => {
    root.traverse((o) => {
      if (o.name.startsWith("opt_")) o.visible = r.parts.has(o.name.slice(4)) || r.parts.has(o.name);
      // GLTFLoader แปลงชื่อ node (เว้นวรรค → _) จึงเทียบทั้งชื่อเดิมและชื่อที่แปลงแล้ว
      if ([...r.hidden].some((h) => h === o.name || THREE.PropertyBinding.sanitizeNodeName(h) === o.name)) o.visible = false;
      const m = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
      if (!m || Array.isArray(m)) return;
      if (r.params[m.name]) own(o as THREE.Mesh).color.set(r.params[m.name]);
      // รูปตัดพื้นหลัง (texture มี alpha + BLEND) → cutout คม เรียงความลึกถูก
      if (m.map && m.transparent) { const x = own(o as THREE.Mesh); x.transparent = false; x.alphaTest = 0.5; x.depthWrite = true; }
    });
  }, [root, r]);
  return <Resize scale={flat ? 3.2 : 2.2}><group rotation-x={flat ? -Math.PI / 2 : 0}><primitive object={root} /></group></Resize>;
}

function Model({ media, r }: { media: Media; r: Resolved }) {
  if (media.type === "glb") return <Center top><Glb url={media.url} r={r} flat={media.flat} /></Center>;
  const preset = r.preset && MODELS[r.preset] ? r.preset : "cup";
  const Comp = MODELS[preset];
  return <Comp p={presetParams(preset, r.params)} on={activeParts(preset, r.parts, r.hidden)} />;
}

function Scaled({ s, children }: { s: number; children: React.ReactNode }) {
  const g = useRef<THREE.Group>(null);
  useEffect(() => { g.current?.scale.setScalar(s); }, [s]);
  return <group ref={g}>{children}</group>;
}

export default function Viewer3D({ media, resolved, title = "" }: { media: Media; resolved: Resolved; title?: string }) {
  // โมเดลจากภาพถ่ายมุมบน (วางราบ): มองจากด้านบนเป็นหลัก ไม่ให้หมุนจนเห็นด้านข้างแบนๆ
  const flat = media.type === "glb" && !!media.flat;
  const [dpr, setDpr] = useState(1.75);
  const [touched, setTouched] = useState(false);
  const controls = useRef<OrbitImpl>(null);
  const model = useRef<THREE.Group>(null);
  const reduced = typeof window !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;

  return (
    <div className="relative size-full">
      <Canvas dpr={dpr} camera={{ position: flat ? [0, 4.6, 3.0] : [3.6, 3.1, 4.6], fov: 32 }} frameloop={reduced ? "demand" : "always"} gl={{ antialias: true, alpha: true }}>
        <PerformanceMonitor onDecline={() => setDpr(1)} />
        <ambientLight intensity={0.35} />
        <directionalLight position={[3, 6, 3]} intensity={1.4} />
        <Environment resolution={128}>
          <Lightformer form="rect" intensity={2.5} position={[0, 5, -3]} scale={[10, 3, 1]} />
          <Lightformer form="rect" intensity={1.6} position={[-5, 2, 2]} rotation-y={Math.PI / 2} scale={[4, 6, 1]} />
          <Lightformer form="rect" intensity={1.2} color="#ffe6c7" position={[5, 2, 3]} rotation-y={-Math.PI / 2} scale={[4, 4, 1]} />
        </Environment>
        <Suspense fallback={null}>
          <group ref={model}><Scaled s={resolved.scale}><Model media={media} r={resolved} /></Scaled></group>
        </Suspense>
        <ContactShadows position-y={-0.001} opacity={0.42} blur={2.6} scale={9} far={3.5} resolution={512} />
        <OrbitControls
          ref={controls} makeDefault enablePan={false} enableDamping target={flat ? [0, 0.05, 0] : [0, 0.95, 0]}
          minDistance={flat ? 2 : 3} maxDistance={10} minPolarAngle={flat ? 0 : 0.15} maxPolarAngle={flat ? 1.05 : Math.PI / 2 - 0.04}
          autoRotate={!touched && !reduced} autoRotateSpeed={1.6} onStart={() => setTouched(true)}
        />
      </Canvas>
      <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
        <span className={`rounded-full bg-black/45 px-3 py-1 text-xs text-white backdrop-blur transition-opacity duration-700 ${touched ? "opacity-0" : "opacity-100"}`}>
          ลากเพื่อหมุน · หยิก/เลื่อนเพื่อซูม
        </span>
      </div>
      <ArButton target={model} media={media} title={title} />
      {touched && (
        <button onClick={() => { controls.current?.reset(); setTouched(false); }}
          className="absolute bottom-3 right-3 rounded-full bg-card/85 px-3 py-1.5 text-xs shadow backdrop-blur">↺ มุมเดิม</button>
      )}
    </div>
  );
}
