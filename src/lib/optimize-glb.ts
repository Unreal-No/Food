import "server-only";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { dedup, meshopt, prune, resample, simplify, textureCompress, weld } from "@gltf-transform/functions";
import { MeshoptDecoder, MeshoptEncoder, MeshoptSimplifier } from "meshoptimizer";
import sharp from "sharp";

const MAX_TRIS = 100_000;

/**
 * บีบอัด GLB ให้อยู่ใน budget (DESIGN §5 ≤ 2MB): รวมข้อมูลซ้ำ · ตัดของไม่ใช้ · ลดสามเหลี่ยมเมื่อเกิน 100k
 * · texture → WebP ≤1024px · meshopt · คงชื่อ node (`opt_*`) และชื่อ material (คีย์เปลี่ยนสี) ไว้เสมอ
 * คืนชื่อ node ที่มี mesh (ให้หลังบ้านเลือกซ่อนได้ เช่น แผ่นรองของโมเดลจากภาพถ่าย)
 */
export async function optimizeGlb(input: Uint8Array) {
  await Promise.all([MeshoptEncoder.ready, MeshoptDecoder.ready, MeshoptSimplifier.ready]);
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
    "meshopt.encoder": MeshoptEncoder, "meshopt.decoder": MeshoptDecoder,
  });
  const doc = await io.readBinary(input);
  const tris = doc.getRoot().listMeshes().flatMap((m) => m.listPrimitives())
    .reduce((a, p) => a + (p.getIndices()?.getCount() ?? p.getAttribute("POSITION")?.getCount() ?? 0) / 3, 0);
  await doc.transform(
    dedup({ keepUniqueNames: true }),
    prune({ keepLeaves: true }),
    weld(),
    ...(tris > MAX_TRIS ? [simplify({ simplifier: MeshoptSimplifier, ratio: MAX_TRIS / tris, error: 0.001 })] : []),
    resample(),
    textureCompress({ encoder: sharp, targetFormat: "webp", resize: [1024, 1024] }),
    meshopt({ encoder: MeshoptEncoder, level: "medium" }),
  );
  const nodes = doc.getRoot().listNodes().filter((n) => n.getMesh()).map((n) => n.getName()).filter(Boolean);
  const out = await io.writeBinary(doc);
  return { bytes: out.byteLength < input.byteLength ? out : input, nodes, tris: Math.round(tris) };
}
