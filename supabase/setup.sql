-- ตั้งค่าเฉพาะ Supabase (รันหลัง drizzle migrations) — ลงแล้วในโปรเจกต์ virtual-storefront
-- แอปเชื่อมต่อฝั่ง server ด้วย role postgres (ข้าม RLS) · ปิดการเข้าถึงผ่าน Data API (anon/authenticated) ทั้งหมด
alter table public.shops enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.option_groups enable row level security;
alter table public.options enable row level security;
alter table public.product_option_groups enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.staff enable row level security;
alter table public.tables enable row level security;
alter table public.coupons enable row level security;
alter table public.customers enable row level security;
revoke all on all tables in schema public from anon, authenticated;

-- bucket สาธารณะสำหรับรูป/โมเดล 3D (อัปโหลดด้วย service role จาก server เท่านั้น)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 15728640, array['model/gltf-binary','image/webp','image/jpeg','image/png','image/avif'])
on conflict (id) do nothing;

-- ตารางใหม่ในอนาคต: อย่าลืม enable row level security ทุกครั้ง
