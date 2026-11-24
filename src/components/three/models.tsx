"use client";
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import * as THREE from "three";

type P = { p: Record<string, string>; on: Set<string> };
const PI = Math.PI;

function useLathe(pts: [number, number][], seg = 64) {
  return useMemo(() => new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), seg), [pts, seg]);
}
// สุ่มแบบคงที่ (seeded) ให้รูปทรงเหมือนเดิมทุกครั้ง
function rand(seed: number) { return () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646; }

const Ceramic = ({ color }: { color: string }) => <meshPhysicalMaterial color={color} roughness={0.28} clearcoat={1} clearcoatRoughness={0.12} />;
const Food = ({ color, rough = 0.7 }: { color: string; rough?: number }) => <meshStandardMaterial color={color} roughness={rough} flatShading />;
const Liquid = ({ color }: { color: string }) => <meshPhysicalMaterial color={color} roughness={0.12} clearcoat={0.8} />;

/* ---------- ชิ้นส่วนใช้ร่วม ---------- */
function Steam() {
  const g = useRef<THREE.Group>(null);
  useFrame(({ clock }) => g.current?.children.forEach((m, i) => {
    const t = (clock.elapsedTime * 0.35 + i / 3) % 1;
    m.position.y = t * 1.4;
    m.position.x = Math.sin(t * 6 + i) * 0.12;
    m.scale.setScalar(0.25 + t * 0.5);
    ((m as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = Math.sin(t * PI) * 0.16;
  }));
  return (
    <group ref={g}>
      {[0, 1, 2].map((i) => (
        <mesh key={i} position-z={(i - 1) * 0.2}>
          <sphereGeometry args={[0.5, 16, 16]} />
          <meshBasicMaterial color="#ffffff" transparent depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

function Whip({ r = 0.75 }: { r?: number }) {
  return (
    <group>
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} position-y={i * 0.16} rotation-x={PI / 2}>
          <torusGeometry args={[r * (1 - i * 0.24), 0.14 * (1 - i * 0.15), 16, 48]} />
          <meshStandardMaterial color="#fffaf2" roughness={0.6} />
        </mesh>
      ))}
      <mesh position-y={0.6}><sphereGeometry args={[0.16, 16, 16]} /><meshStandardMaterial color="#fffaf2" roughness={0.6} /></mesh>
    </group>
  );
}

function Leaves({ n, spread, y, seed, color = "#3f7d2a" }: { n: number; spread: number; y: number; seed: number; color?: string }) {
  const items = useMemo(() => { const r = rand(seed); return Array.from({ length: n }, () => [(r() - 0.5) * spread, (r() - 0.5) * spread, r() * PI, r() * 0.5] as const); }, [n, spread, seed]);
  return (
    <group position-y={y}>
      {items.map(([x, z, rot, tilt], i) => (
        <mesh key={i} position={[x, 0.02 * i, z]} rotation={[tilt - PI / 2, 0, rot]} scale={[0.14, 0.24, 1]}>
          <circleGeometry args={[1, 12]} />
          <meshStandardMaterial color={color} roughness={0.5} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}

/* ---------- presets ---------- */
const CUP: [number, number][] = [[0, 0], [0.55, 0], [0.62, 0.06], [0.82, 0.9], [0.9, 1.15], [0.94, 1.2], [0.88, 1.2], [0.84, 1.12], [0.6, 0.14], [0, 0.14]];
const SAUCER: [number, number][] = [[0, 0], [1.25, 0], [1.45, 0.1], [1.42, 0.13], [1.2, 0.06], [0, 0.06]];

export function Cup({ p, on }: P) {
  const body = useLathe(CUP), saucer = useLathe(SAUCER);
  return (
    <group>
      {on.has("saucer") && <mesh geometry={saucer}><Ceramic color={p.ceramic} /></mesh>}
      <group position-y={on.has("saucer") ? 0.06 : 0}>
        <mesh geometry={body}><Ceramic color={p.ceramic} /></mesh>
        <mesh position={[0.86, 0.66, 0]} rotation-z={-PI * 0.62}>
          <torusGeometry args={[0.27, 0.065, 16, 32, PI * 1.25]} /><Ceramic color={p.ceramic} />
        </mesh>
        <mesh position-y={1.0} rotation-x={-PI / 2}><circleGeometry args={[0.81, 48]} /><Liquid color={p.liquid} /></mesh>
        {on.has("art") && (
          <group position-y={1.004} rotation-x={-PI / 2}>
            <mesh><ringGeometry args={[0.2, 0.36, 48]} /><meshStandardMaterial color={p.art} roughness={0.4} /></mesh>
            <mesh position-z={0.002}><circleGeometry args={[0.1, 32]} /><meshStandardMaterial color={p.art} roughness={0.4} /></mesh>
          </group>
        )}
        {on.has("whip") && <group position-y={1.02}><Whip r={0.62} /></group>}
        {on.has("steam") && !on.has("whip") && <group position-y={1.2}><Steam /></group>}
      </group>
    </group>
  );
}

const GLASS: [number, number][] = [[0, 0], [0.7, 0], [0.78, 0.05], [0.95, 2.5], [0.9, 2.5], [0.74, 0.12], [0, 0.12]];
const wallR = (y: number) => 0.73 + (0.16 * (y - 0.12)) / 2.38;

export function Glass({ p, on }: P) {
  const body = useLathe(GLASS);
  const frappe = on.has("whip") && !on.has("ice");
  const top = frappe ? 2.3 : 2.05, split = p.layer ? (frappe ? 1.5 : 1.2) : top;
  const ice = useMemo(() => { const r = rand(7); return Array.from({ length: 6 }, (_, i) => [Math.cos(i * 1.1) * 0.38, 1.55 + r() * 0.5, Math.sin(i * 1.1) * 0.38, r() * PI, r() * PI] as const); }, []);
  const pearls = useMemo(() => { const r = rand(3); return Array.from({ length: 16 }, () => { const a = r() * PI * 2, d = r() * 0.55; return [Math.cos(a) * d, 0.2 + r() * 0.25, Math.sin(a) * d] as const; }); }, []);
  const layer = (y0: number, y1: number, color: string) => (
    <mesh position-y={(y0 + y1) / 2}>
      <cylinderGeometry args={[wallR(y1) - 0.02, wallR(y0) - 0.02, y1 - y0, 48]} />
      <meshPhysicalMaterial color={color} roughness={frappe ? 0.8 : 0.2} transparent opacity={0.93} />
    </mesh>
  );
  return (
    <group scale={0.74}>
      {layer(0.13, split, p.liquid)}
      {p.layer && layer(split, top, p.layer)}
      {on.has("ice") && ice.map(([x, y, z, a, b], i) => (
        <RoundedBox key={i} args={[0.42, 0.42, 0.42]} radius={0.08} position={[x, y, z]} rotation={[a, b, 0]}>
          <meshPhysicalMaterial color="#eaf6ff" roughness={0.05} transparent opacity={0.55} clearcoat={1} />
        </RoundedBox>
      ))}
      {on.has("pearls") && pearls.map(([x, y, z], i) => (
        <mesh key={i} position={[x, y, z]}><sphereGeometry args={[0.1, 12, 12]} /><meshPhysicalMaterial color="#2b1a12" roughness={0.15} clearcoat={1} /></mesh>
      ))}
      <mesh geometry={body} renderOrder={2}>
        <meshPhysicalMaterial color="#ffffff" roughness={0.04} clearcoat={1} transparent opacity={0.22} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      {on.has("whip") && <group position-y={top}><Whip r={0.78} /></group>}
      {on.has("straw") && (
        <mesh position={[0.28, 2.0, 0.1]} rotation-z={-0.2}><cylinderGeometry args={[0.06, 0.06, 2.8, 16]} /><meshStandardMaterial color={p.straw} roughness={0.4} /></mesh>
      )}
      {on.has("slice") && (
        <group position={[-0.86, 2.45, 0]} rotation={[0, 0, PI / 2 - 0.2]}>
          <mesh><cylinderGeometry args={[0.42, 0.42, 0.07, 32]} /><meshStandardMaterial color={p.slice} roughness={0.5} /></mesh>
          <mesh position-y={0.04}><cylinderGeometry args={[0.36, 0.36, 0.01, 32]} /><meshStandardMaterial color="#fff7d6" roughness={0.6} /></mesh>
        </group>
      )}
    </group>
  );
}

const PLATE: [number, number][] = [[0, 0], [1.5, 0], [1.9, 0.12], [2.02, 0.2], [1.96, 0.22], [1.45, 0.09], [0, 0.09]];

export function Plate({ p, on }: P) {
  const plate = useLathe(PLATE);
  const rice = useMemo(() => {
    const g = new THREE.IcosahedronGeometry(0.85, 5), pos = g.attributes.position, r = rand(11);
    for (let i = 0; i < pos.count; i++) pos.setXYZ(i, pos.getX(i) * (1 + r() * 0.05), pos.getY(i) * (1 + r() * 0.05), pos.getZ(i) * (1 + r() * 0.05));
    g.computeVertexNormals();
    return g;
  }, []);
  const bits = useMemo(() => { const r = rand(5); return Array.from({ length: 22 }, () => { const a = r() * PI * 2, d = Math.sqrt(r()) * 0.62; return [0.6 + Math.cos(a) * d, 0.12 + r() * 0.22, Math.sin(a) * d, 0.12 + r() * 0.12, r() * PI] as const; }); }, []);
  const shade = (hex: string, k: number) => `#${new THREE.Color(hex).multiplyScalar(k).getHexString()}`;
  return (
    <group>
      <mesh geometry={plate}><Ceramic color={p.plate} /></mesh>
      {on.has("rice") && <mesh geometry={rice} position={[-0.45, 0.09, -0.1]} scale={[1, 0.62, 1]}><meshStandardMaterial color={p.rice} roughness={0.95} /></mesh>}
      {on.has("topping") && bits.map(([x, y, z, s, rot], i) => (
        <mesh key={i} position={[x, y, z]} rotation={[rot, rot * 2, 0]} scale={s}>
          <dodecahedronGeometry args={[1, 0]} /><Food color={shade(p.topping, 0.8 + (i % 4) * 0.12)} rough={0.45} />
        </mesh>
      ))}
      {on.has("topping") && on.has("herbs") && <Leaves n={9} spread={1.1} y={0.42} seed={9} />}
      {on.has("egg") && (
        <group position={[0.1, 0.62, 0.55]} rotation-x={-0.15}>
          <mesh scale={[1, 0.12, 0.85]}><sphereGeometry args={[0.6, 32, 16]} /><meshStandardMaterial color="#fffdf7" roughness={0.35} /></mesh>
          <mesh position={[0.05, 0.06, 0]} scale={[1, 0.65, 1]}><sphereGeometry args={[0.22, 24, 16]} /><meshPhysicalMaterial color="#f6b21b" roughness={0.2} clearcoat={1} /></mesh>
        </group>
      )}
      {on.has("omelet") && (
        <mesh position={[0.25, 0.55, 0.6]} scale={[1.2, 0.42, 0.85]}><sphereGeometry args={[0.6, 24, 16]} /><Food color="#f0bd45" rough={0.6} /></mesh>
      )}
      {on.has("cucumber") && [0, 1, 2].map((i) => (
        <group key={i} position={[-1.25 + i * 0.12, 0.16 + i * 0.03, 0.75 - i * 0.18]} rotation-x={-0.1}>
          <mesh><cylinderGeometry args={[0.2, 0.2, 0.05, 24]} /><meshStandardMaterial color="#5c8a2e" /></mesh>
          <mesh position-y={0.03}><cylinderGeometry args={[0.17, 0.17, 0.01, 24]} /><meshStandardMaterial color="#e3f2c4" /></mesh>
        </group>
      ))}
    </group>
  );
}

const BOWL: [number, number][] = [[0, 0], [0.6, 0], [0.68, 0.08], [1.25, 0.75], [1.45, 1.1], [1.38, 1.12], [1.18, 0.8], [0.6, 0.16], [0, 0.16]];

export function Bowl({ p, on }: P) {
  const bowl = useLathe(BOWL);
  return (
    <group>
      <mesh geometry={bowl}><Ceramic color={p.bowl} /></mesh>
      <mesh position-y={0.92} rotation-x={-PI / 2}><circleGeometry args={[1.3, 48]} /><Liquid color={p.liquid} /></mesh>
      {on.has("shrimp") && [0, 1, 2].map((i) => (
        <mesh key={i} position={[Math.cos(i * 2.1) * 0.6, 0.98, Math.sin(i * 2.1) * 0.6]} rotation={[PI / 2, 0, i * 2]}>
          <torusGeometry args={[0.24, 0.1, 12, 24, PI * 1.4]} /><Food color="#f08a5d" rough={0.4} />
        </mesh>
      ))}
      {on.has("herbs") && <Leaves n={7} spread={1.6} y={0.95} seed={4} />}
      {on.has("chili") && [0, 1, 2, 3].map((i) => (
        <mesh key={i} position={[-0.3 + i * 0.22, 0.95, 0.4 - (i % 2) * 0.5]} rotation-x={PI / 2}>
          <torusGeometry args={[0.06, 0.025, 8, 16]} /><meshStandardMaterial color="#d62828" />
        </mesh>
      ))}
    </group>
  );
}

export function Croissant({ p, on }: P) {
  const plate = useLathe(PLATE);
  const segs = useMemo(() => Array.from({ length: 7 }, (_, k) => {
    const i = k - 3, a = i * 0.34;
    return { x: Math.sin(a) * 1.05, z: Math.cos(a) * 1.05 - 1.05, a, s: 0.46 * (1 - Math.abs(i) * 0.17), k: 1 - Math.abs(i) * 0.08 };
  }), []);
  return (
    <group>
      {on.has("plate") && <mesh geometry={plate} scale={[0.85, 1, 0.85]}><Ceramic color="#ffffff" /></mesh>}
      <group position={[0, 0.42, 0.45]}>
        {segs.map((g, i) => (
          <mesh key={i} position={[g.x, 0, g.z]} rotation-y={g.a} scale={[g.s * 1.35, g.s * 0.85, g.s]}>
            <sphereGeometry args={[1, 32, 24]} />
            <meshPhysicalMaterial color={new THREE.Color(p.crust).multiplyScalar(g.k)} roughness={0.5} clearcoat={0.35} />
          </mesh>
        ))}
        {on.has("sugar") && <mesh position-y={0.36} rotation-x={-PI / 2} scale={[1.2, 0.5, 1]}><circleGeometry args={[0.7, 24]} /><meshStandardMaterial color="#ffffff" transparent opacity={0.6} /></mesh>}
      </group>
    </group>
  );
}

// ชิ้นเค้กแบบ extrude (มีหน้าตัดจริง) · ปลายชิ้นหันเข้ากล้อง
const CAKE_A = 2.23 - PI / 6;

export function Cake({ p, on }: P) {
  const plate = useLathe(PLATE);
  const wedge = useMemo(() => {
    const sh = new THREE.Shape();
    sh.moveTo(0, 0); sh.absarc(0, 0, 1.5, CAKE_A, CAKE_A + PI / 3, false); sh.lineTo(0, 0);
    const g = new THREE.ExtrudeGeometry(sh, { depth: 1, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 3, curveSegments: 32 });
    g.rotateX(-PI / 2);
    return g;
  }, []);
  const mats = useMemo(() => [
    new THREE.MeshPhysicalMaterial({ color: p.top, roughness: 0.5, clearcoat: 0.4 }),
    new THREE.MeshStandardMaterial({ color: p.body, roughness: 0.85 }),
  ], [p.top, p.body]);
  const dir = CAKE_A + PI / 6;
  return (
    <group>
      {on.has("plate") && <mesh geometry={plate} scale={[0.85, 1, 0.85]}><Ceramic color="#ffffff" /></mesh>}
      <group position={[0.58, 0.14, 0.75]}>
        <mesh geometry={wedge} material={mats} />
        {on.has("berry") && [0.5, 0.8, 1.1].map((d, i) => (
          <mesh key={i} position={[Math.cos(dir) * d, 1.15, -Math.sin(dir) * d]}><sphereGeometry args={[0.12, 16, 16]} /><meshPhysicalMaterial color="#b3122e" clearcoat={1} roughness={0.2} /></mesh>
        ))}
      </group>
    </group>
  );
}

export const MODELS: Record<string, (props: P) => React.JSX.Element> = { cup: Cup, glass: Glass, plate: Plate, bowl: Bowl, croissant: Croissant, cake: Cake };
