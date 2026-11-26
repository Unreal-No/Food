import "server-only";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { dedup, meshopt, prune, resample, textureCompress, weld } from "@gltf-transform/functions";
import { MeshoptDecoder, MeshoptEncoder } from "meshoptimizer";
import sharp from "sharp";

/**
 * บีบอัด GLB ให้อยู่ใน budget (DESIGN §5 ≤ 2MB): รวมข้อมูลซ้ำ · ตัดของไม่ใช้ · texture → WebP ≤1024px · meshopt
 * คงชื่อ node (`opt_*`) และชื่อ material (คีย์เปลี่ยนสี) ไว้เสมอ · ถ้าบีบแล้วไม่เล็กลง ใช้ไฟล์เดิม
 */
export async function optimizeGlb(input: Uint8Array) {
  await Promise.all([MeshoptEncoder.ready, MeshoptDecoder.ready]);
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
    "meshopt.encoder": MeshoptEncoder, "meshopt.decoder": MeshoptDecoder,
  });
  const doc = await io.readBinary(input);
  await doc.transform(
    dedup({ keepUniqueNames: true }),
    prune({ keepLeaves: true }),
    weld(),
    resample(),
    textureCompress({ encoder: sharp, targetFormat: "webp", resize: [1024, 1024] }),
    meshopt({ encoder: MeshoptEncoder, level: "medium" }),
  );
  const out = await io.writeBinary(doc);
  return out.byteLength < input.byteLength ? out : input;
}
