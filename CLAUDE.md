# Virtual Storefront

แบบระบบ: `docs/DESIGN.md` — อ่านก่อนเริ่มงาน
@AGENTS.md

## Stack
Next.js (App Router, TS) · React Three Fiber + drei · Spark (Gaussian splat) · model-viewer (AR) · GSAP + Motion · Tailwind v4 · Zustand · Drizzle ORM (dev: PGlite ใน `.data/`, prod: Supabase Postgres ผ่าน `DATABASE_URL`)

Next 16: เปิด `cacheComponents` — อ่านข้อมูลสดต้องอยู่ใน `<Suspense>`, หน้าร้านใช้ `"use cache"` + `cacheTag(shopTag(slug))`, action หลังบ้านต้อง `updateTag`

## 3D
- Preset: meta ใน `lib/presets.ts`, โมเดลใน `components/three/models.tsx` (เพิ่ม preset = เพิ่มทั้งสองที่)
- ผลของ variant/option = `Visual` (preset/params/show/hide/scale) รวมด้วย `lib/visual.ts`
- ฉากร้าน: ผัง/โซน/ช่องวางใน `lib/scene.ts`, ฉากใน `components/three/StoreScene.tsx` · ห้ามใช้ drei `<Html>` ใน Canvas (React root ซ้อน → error ตอน unmount) ใช้ CanvasTexture หรือ DOM overlay
- GLB ที่อัปโหลดผ่าน `optimizeGlb()` (`lib/optimize-glb.ts`) เสมอ · migration ใหม่ต้องลง Supabase ด้วย (MCP `apply_migration` + บันทึก hash ใน `drizzle.__drizzle_migrations`)
- three.js โหลดผ่าน `next/dynamic` เท่านั้น (ห้าม import ใน component ที่อยู่ใน initial bundle)

## หลังบ้าน
- สิทธิ์: `lib/perms.ts` (บทบาท → Perm) · ทุกหน้า/ action เรียก `requireShop(slug, perm)` หรือ `ctx(slug, perm)`
- Realtime: `publish()` หลังเปลี่ยนออเดอร์ (db/index.ts) → SSE `/api/admin/[shop]/events`, `/api/orders/[id]/events` → `<LiveRefresh>`
- ห้ามส่ง `shops.integrations` (token) ไป client
- AI: client/รุ่นใน `lib/ai.ts` · ใช้ structured output (`zodOutputFormat`) · ทดสอบด้วย `ANTHROPIC_BASE_URL` ชี้ mock
- Supabase: โปรเจกต์ `fjwkzojulvqpwycdltlw` · ตารางใหม่ต้อง `enable row level security` (ดู `supabase/setup.sql`)
- ข้อมูลลับใน DB: `seal()/unseal()` (`lib/secret.ts`) · ไฟล์: `lib/storage.ts` (Supabase หรือในเครื่อง) · คู่มือ: `docs/DEPLOY.md`
- กราฟ: `components/admin/charts.tsx` ตามหลัก dataviz (แท่ง ≤24px, tooltip, มุมมองตาราง)
- คูปอง/แต้ม: `lib/coupons.ts` · server คำนวณส่วนลดใหม่ตอนสั่ง + `claimCoupon` ใน transaction

## กฎ
- ตอบสั้น กระชับ
- ทุก query กรอง `shop_id` (server ใช้ Drizzle ตรง จึงไม่ผ่าน RLS)
- ราคาเก็บเป็นสตางค์ (integer) · server คำนวณราคาใหม่เสมอ (`lib/pricing.ts`)
- 3D ต้องมี fallback 2D และอยู่ใน performance budget (DESIGN §5)
- ราคาใน order เป็น snapshot

## Model routing
- Opus 5.5: สถาปัตยกรรม, 3D/shader ยาก, review
- Sonnet 5.5: เขียนฟีเจอร์/UI (subagent `model: sonnet`)
- Haiku 5.5: งานซ้ำ, seed, แปล (subagent `model: haiku`)

## Skills เสริม (ตรวจเนื้อหาก่อนติดตั้ง)
```bash
npx -y skills add freshtechbro/claudedesignskills --skill react-three-fiber --agent claude-code
npx -y skills add freshtechbro/claudedesignskills --skill web3d-integration-patterns --agent claude-code
npx -y skills add freshtechbro/claudedesignskills --skill gsap-scrolltrigger --agent claude-code
npx -y skills add freshtechbro/claudedesignskills --skill blender-web-pipeline --agent claude-code
npx skills add supabase/agent-skills
```
