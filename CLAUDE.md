# Virtual Storefront

แบบระบบ: `docs/DESIGN.md` — อ่านก่อนเริ่มงาน

## Stack
Next.js (App Router, TS) · React Three Fiber + drei · Spark (Gaussian splat) · model-viewer (AR) · GSAP + Motion · Tailwind + shadcn/ui · Zustand · Supabase

## กฎ
- ตอบสั้น กระชับ
- ทุกตารางมี `shop_id` + RLS
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
