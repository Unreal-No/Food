# Virtual Storefront

ร้านค้าออนไลน์ที่ตั้งค่าเองได้ (คาเฟ่ / ร้านอาหาร / ร้านค้า) — แบบระบบเต็มอยู่ที่ [docs/DESIGN.md](docs/DESIGN.md)

## เริ่มใช้งาน

```bash
npm install
npm run dev        # http://localhost:3000  (สร้าง DB + ข้อมูลตัวอย่าง 2 ร้านอัตโนมัติ)
```

| หน้า | URL |
|---|---|
| รวมร้าน | `/` |
| หน้าร้าน | `/mellow-bean`, `/baan-som` |
| หลังบ้าน | `/admin` (รหัส dev: `admin`) |

## ทำแล้ว (P0)
- หน้าร้านตามธีมของร้าน, หมวดหมู่ + scroll-spy, การ์ดเอียงตามเมาส์
- เลือกแบบย่อย (ร้อน/เย็น, S/M/L) + กลุ่มตัวเลือกเสริม (ขั้นต่ำ/สูงสุด/บวกราคา/ของหมด)
- ตะกร้า → สั่งซื้อ (ทานที่ร้าน/กลับบ้าน) → PromptPay QR ตามยอด → ติดตามสถานะ
- หลังบ้าน: ภาพรวมยอดขาย, ออเดอร์ (ยืนยันเงิน → ทำ → พร้อม → ส่งมอบ), สินค้า + variants + สต็อก, หมวดหมู่, กลุ่มตัวเลือก, ธีม/เวลาเปิด/PromptPay
- ราคาคำนวณใหม่ที่ server ทุกครั้ง, ตัดสต็อกใน transaction

## Production
ตั้ง `DATABASE_URL` (Supabase Postgres), `ADMIN_PASSWORD`, `AUTH_SECRET` แล้ว `npm run db:migrate && npm run build`

## ถัดไป
P1 ตัวดูสินค้า 3D (GLB / turntable) · P2 เดินชมร้าน 3D · P3 Realtime/KDS/LINE · P4 AI Barista
