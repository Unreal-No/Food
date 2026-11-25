# ขึ้นระบบจริง (Supabase + Vercel)

## สถานะปัจจุบัน
โปรเจกต์ Supabase **`virtual-storefront`** (ref `fjwkzojulvqpwycdltlw`, Singapore, แพ็กเกจ free) — `https://fjwkzojulvqpwycdltlw.supabase.co`
- ✅ ตารางครบ (migrations 0000–0005) + บันทึกใน `drizzle.__drizzle_migrations` แล้ว → `npm run db:migrate` จะลงเฉพาะของใหม่
- ✅ RLS เปิดทุกตาราง + revoke anon/authenticated (`supabase/setup.sql`) — Data API อ่าน/เขียนไม่ได้, แอปใช้ role postgres ผ่าน `DATABASE_URL`
- ✅ bucket `media` (public, ≤15MB, เฉพาะรูป/GLB)
- ⏳ ที่เหลือต้องทำใน Dashboard (ค่าลับ ไม่ผ่าน MCP): รหัสฐานข้อมูล + service_role key → ใส่ env ตามข้อ 2

## 1. Supabase (กรณีสร้างใหม่)
1. สร้างโปรเจกต์ (region ใกล้ลูกค้า เช่น Singapore)
2. **Database → Connect** (ถ้าไม่รู้รหัส: Database → Settings → Reset database password): คัด 2 URL
   - `DATABASE_URL` = Transaction pooler (port 6543) — ใช้กับ query ทั่วไป
   - `DATABASE_LISTEN_URL` = Session pooler (port 5432) หรือ Direct — ใช้กับ realtime (LISTEN/NOTIFY ใช้ผ่าน transaction pooler ไม่ได้)
3. **Storage → New bucket** ชื่อ `media` แบบ **Public**
4. **Project Settings → API**: คัด `SUPABASE_URL` และ `service_role` key (เก็บฝั่ง server เท่านั้น)
5. สร้างตาราง: `DATABASE_URL=... npm run db:migrate` แล้วรัน `supabase/setup.sql` ใน SQL Editor

## 2. Environment variables
| ชื่อ | จำเป็น | คำอธิบาย |
|---|---|---|
| `DATABASE_URL` | ✅ | Postgres (transaction pooler) |
| `DATABASE_LISTEN_URL` | แนะนำ | Postgres แบบ session สำหรับ realtime |
| `ADMIN_PASSWORD` | ✅ | รหัสผู้ดูแลระบบ (`admin`) |
| `AUTH_SECRET` | ✅ | สุ่มยาว ≥ 32 ตัว (เซ็น cookie) |
| `DATA_KEY` | ✅ | สุ่มยาว ≥ 32 ตัว (เข้ารหัส token LINE) — **ห้ามเปลี่ยนหลังใช้งาน** ไม่งั้นต้องตั้ง token ใหม่ |
| `SITE_URL` | ✅ | เช่น `https://shop.example.com` (ใช้ใน QR โต๊ะ) |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | ✅ | ที่เก็บรูป/โมเดล 3D |
| `STORAGE_BUCKET` | – | ค่าเริ่มต้น `media` |
| `ANTHROPIC_API_KEY` | – | เปิดผู้ช่วย AI + นำเข้าเมนูจากรูป |

สุ่มค่า: `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`

## 3. Deploy
- **Vercel**: import repo → ใส่ env → Deploy · ตรวจ `GET /api/health` = `{"ok":true}`
- เข้า `/admin` ด้วย `admin` + `ADMIN_PASSWORD` → **+ สร้างร้านใหม่** (ได้บัญชีเจ้าของร้าน) → ให้เจ้าของตั้งค่าร้าน/เมนู/โต๊ะ

## ข้อควรรู้
- **Realtime (SSE) บน serverless**: ฟังก์ชันมีเวลาทำงานจำกัด การเชื่อมต่อจะหลุดเป็นระยะ ระบบต่อใหม่และ refresh ให้เอง ใช้งานได้ แต่ถ้าครัวต้องการความนิ่งสูง ให้รันบนเครื่องแบบ long-running (Docker/Fly/Railway) หรือเปลี่ยนไปใช้ Supabase Realtime
- **Rate limit** (AI, นำเข้าเมนู) เก็บในหน่วยความจำต่อ instance — หลาย instance = จำกัดหลวมขึ้น ถ้าต้องเข้มให้ย้ายไป Redis/Upstash
- **Backup**: เปิด Point-in-Time Recovery ใน Supabase (แพ็กเกจ Pro)
- ข้อมูลตัวอย่าง (seed) ถูกสร้างเฉพาะโหมด dev (PGlite) — production เริ่มว่าง
