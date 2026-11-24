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

/** GLB: node ชื่อขึ้นต้น "opt_" ซ่อนไว้จนกว่าจะถูก show · params จับคู่กับชื่อ material */
export function Glb({ url, r }: { url: string; r: Resolved }) {
  const { scene } = useGLTF(url, false, true);
  const root = useMemo(() => scene.clone(true), [scene]);
  useEffect(() => {
    root.traverse((o) => {
      if (o.name.startsWith("opt_")) o.visible = r.parts.has(o.name.slice(4)) || r.parts.has(o.name);
      if (r.hidden.has(o.name)) o.visible = false;
      const m = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
      if (m && !Array.isArray(m) && r.params[m.name]) {
        if (!m.userData.cloned) { (o as THREE.Mesh).material = m.clone(); ((o as THREE.Mesh).material as THREE.Material).userData.cloned = true; }
        ((o as THREE.Mesh).material as THREE.MeshStandardMaterial).color.set(r.params[m.name]);
      }
    });
  }, [root, r]);
  return <Resize scale={2.2}><primitive object={root} /></Resize>;
}

function Model({ media, r }: { media: Media; r: Resolved }) {
  if (media.type === "glb") return <Center top><Glb url={media.url} r={r} /></Center>;
  const preset = r.preset && MODELS[r.preset] ? r.preset : "cup";
  const Comp = MODELS[preset];
  return <Comp p={presetParams(preset, r.params)} on={activeParts(preset, r.parts, r.hidden)} />;
}

function Scaled({ s, children }: { s: number; children: React.ReactNode }) {
  const g = useRef<THREE.Group>(null);
  useEffect(() => { g.current?.scale.setScalar(s); }, [s]);
  return <group ref={g}>{children}</group>;
}

export default function Viewer3D({ media, resolved }: { media: Media; resolved: Resolved }) {
  const [dpr, setDpr] = useState(1.75);
  const [touched, setTouched] = useState(false);
  const controls = useRef<OrbitImpl>(null);
  const reduced = typeof window !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;

  return (
    <div className="relative size-full">
      <Canvas dpr={dpr} camera={{ position: [3.6, 3.1, 4.6], fov: 32 }} frameloop={reduced ? "demand" : "always"} gl={{ antialias: true, alpha: true }}>
        <PerformanceMonitor onDecline={() => setDpr(1)} />
        <ambientLight intensity={0.35} />
        <directionalLight position={[3, 6, 3]} intensity={1.4} />
        <Environment resolution={128}>
          <Lightformer form="rect" intensity={2.5} position={[0, 5, -3]} scale={[10, 3, 1]} />
          <Lightformer form="rect" intensity={1.6} position={[-5, 2, 2]} rotation-y={Math.PI / 2} scale={[4, 6, 1]} />
          <Lightformer form="rect" intensity={1.2} color="#ffe6c7" position={[5, 2, 3]} rotation-y={-Math.PI / 2} scale={[4, 4, 1]} />
        </Environment>
        <Suspense fallback={null}>
          <Scaled s={resolved.scale}><Model media={media} r={resolved} /></Scaled>
        </Suspense>
        <ContactShadows position-y={-0.001} opacity={0.42} blur={2.6} scale={9} far={3.5} resolution={512} />
        <OrbitControls
          ref={controls} makeDefault enablePan={false} enableDamping target={[0, 0.95, 0]}
          minDistance={3} maxDistance={10} minPolarAngle={0.15} maxPolarAngle={Math.PI / 2 - 0.04}
          autoRotate={!touched && !reduced} autoRotateSpeed={1.6} onStart={() => setTouched(true)}
        />
      </Canvas>
      <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
        <span className={`rounded-full bg-black/45 px-3 py-1 text-xs text-white backdrop-blur transition-opacity duration-700 ${touched ? "opacity-0" : "opacity-100"}`}>
          ลากเพื่อหมุน · หยิก/เลื่อนเพื่อซูม
        </span>
      </div>
      {touched && (
        <button onClick={() => { controls.current?.reset(); setTouched(false); }}
          className="absolute bottom-3 right-3 rounded-full bg-card/85 px-3 py-1.5 text-xs shadow backdrop-blur">↺ มุมเดิม</button>
      )}
    </div>
  );
}
