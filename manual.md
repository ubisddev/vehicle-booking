# คู่มือติดตั้งระบบ AI-UBISD Vehicle Intelligent System

## ระบบขอใช้รถยนต์ราชการอัจฉริยะ

คู่มือนี้สำหรับหน่วยงานที่ต้องการติดตั้งระบบขอใช้รถยนต์ราชการ ครอบคลุมทุกขั้นตอนตั้งแต่เริ่มต้นจนใช้งานได้

---

## สิ่งที่ต้องเตรียม

- อีเมล (สำหรับสมัคร GitHub, Supabase, Vercel)
- เครื่องคอมพิวเตอร์ที่ติดตั้ง Node.js (v18 ขึ้นไป) และ Git

### ติดตั้ง Node.js และ Git (ถ้ายังไม่มี)

**macOS:**
```bash
# ติดตั้ง Homebrew (ถ้ายังไม่มี)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# ติดตั้ง Node.js และ Git
brew install node git
```

**Windows:**
- ดาวน์โหลด Node.js จาก https://nodejs.org (เลือก LTS)
- ดาวน์โหลด Git จาก https://git-scm.com/download/win

**ตรวจสอบ:**
```bash
node --version   # ควรได้ v18 ขึ้นไป
git --version    # ควรได้ git version 2.x
```

---

## ขั้นตอนที่ 1: สมัคร GitHub และ Fork โปรเจค

### 1.1 สมัคร GitHub
1. ไปที่ https://github.com/signup
2. กรอกอีเมล สร้างรหัสผ่าน เลือก username
3. ยืนยันอีเมล

### 1.2 Fork โปรเจค
1. ไปที่ https://github.com/ubisddev/vehicle-booking
2. กดปุ่ม **Fork** (มุมขวาบน)
3. เลือก account ของตัวเอง → กด **Create fork**
4. จะได้ repo ใหม่ที่ `https://github.com/YOUR-USERNAME/vehicle-booking`

### 1.3 Clone มาเครื่อง
```bash
git clone https://github.com/YOUR-USERNAME/vehicle-booking.git
cd vehicle-booking
npm install
```

---

## ขั้นตอนที่ 2: สร้าง Supabase Project

### 2.1 สมัคร Supabase
1. ไปที่ https://supabase.com
2. กด **Start your project** → Sign up ด้วย GitHub
3. กด **New project**
4. ตั้งชื่อ เช่น `vehicle-booking-หน่วยงาน`
5. ตั้ง Database Password (จดไว้)
6. เลือก Region: **Southeast Asia (Singapore)**
7. กด **Create new project** → รอ 1-2 นาที

### 2.2 สร้างตาราง
1. ไปที่ **SQL Editor** (เมนูซ้าย)
2. กด **New query**
3. คัดลอก SQL ด้านล่างวางทั้งหมด แล้วกด **Run**

```sql
-- =============================================
-- ตารางกลุ่มงาน
-- =============================================
CREATE TABLE departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- ตารางผู้ใช้
-- =============================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  position TEXT NOT NULL,
  department TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'supervisor', 'approver', 'admin')),
  is_approved BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- ตารางรถยนต์
-- =============================================
CREATE TABLE vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plate_number TEXT UNIQUE NOT NULL,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  vehicle_type TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- ตารางคำขอใช้รถ
-- =============================================
CREATE TABLE vehicle_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID REFERENCES users(id) ON DELETE SET NULL,
  request_date DATE NOT NULL DEFAULT CURRENT_DATE,
  departure_datetime TIMESTAMPTZ NOT NULL,
  return_datetime TIMESTAMPTZ NOT NULL,
  destination TEXT NOT NULL,
  purpose TEXT NOT NULL,
  passengers TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'supervisor_approved', 'approved', 'rejected')),
  supervisor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  supervisor_approved_at TIMESTAMPTZ,
  supervisor_comment TEXT,
  approver_id UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  approver_comment TEXT,
  approved_vehicle_id UUID REFERENCES vehicles(id),
  approved_driver_name TEXT,
  requester_signature TEXT,
  supervisor_signature TEXT,
  approver_signature TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_requests_requester ON vehicle_requests(requester_id);
CREATE INDEX idx_requests_status ON vehicle_requests(status);
CREATE INDEX idx_requests_supervisor ON vehicle_requests(supervisor_id);
CREATE INDEX idx_requests_approver ON vehicle_requests(approver_id);

-- RLS
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "departments_read" ON departments FOR SELECT USING (true);
CREATE POLICY "departments_admin" ON departments FOR ALL USING (true);
CREATE POLICY "users_read" ON users FOR SELECT USING (true);
CREATE POLICY "users_admin" ON users FOR ALL USING (true);
CREATE POLICY "vehicles_read" ON vehicles FOR SELECT USING (true);
CREATE POLICY "vehicles_admin" ON vehicles FOR ALL USING (true);
CREATE POLICY "requests_read" ON vehicle_requests FOR SELECT USING (true);
CREATE POLICY "requests_all" ON vehicle_requests FOR ALL USING (true);
```

### 2.3 เพิ่มกลุ่มงานและ Admin
สร้าง query ใหม่ วาง SQL นี้แล้วกด Run:

```sql
-- เพิ่มกลุ่มงาน (แก้ไขตามหน่วยงาน)
INSERT INTO departments (name) VALUES
  ('ฝ่ายบริหารทั่วไป'),
  ('กลุ่มงาน 1'),
  ('กลุ่มงาน 2'),
  ('กลุ่มงาน 3');

-- เพิ่ม Admin (อีเมล: admin@example.com / รหัสผ่าน: admin1234)
INSERT INTO users (email, password_hash, full_name, position, department, role)
VALUES (
  'admin@example.com',
  'ac9689e2272427085e35b9d3e3e8bed88cb3434828b43b86fc0596cad4c6e270',
  'ผู้ดูแลระบบ',
  'ผู้ดูแลระบบ',
  'ฝ่ายบริหารทั่วไป',
  'admin'
);
```

> ⚠️ แก้ชื่อกลุ่มงานตามหน่วยงานจริง และแก้อีเมล admin ตามต้องการ
> รหัสผ่านเริ่มต้น: `admin1234` (เปลี่ยนหลังเข้าระบบครั้งแรก)

### 2.4 คัดลอก API Keys
1. ไปที่ **Settings** → **API**
2. จดค่าเหล่านี้:
   - **Project URL** เช่น `https://xxxxxxxx.supabase.co`
   - **anon public** key
   - **service_role** key (กดปุ่ม Reveal เพื่อดู)

---

## ขั้นตอนที่ 3: ตั้งค่า Environment Variables

### 3.1 สร้างไฟล์ .env.local
ในโฟลเดอร์ `vehicle-booking` สร้างไฟล์ `.env.local`:

```bash
cp .env.local.example .env.local
```

แก้ไขไฟล์ `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...ค่าจาก_Supabase
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...ค่าจาก_Supabase

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=อีเมลที่ใช้ส่ง@gmail.com
SMTP_PASS=app_password_จาก_google
SMTP_FROM=noreply@หน่วยงาน.go.th

NEXT_PUBLIC_APP_URL=http://localhost:3000

# Groq AI (สมัครฟรีที่ https://console.groq.com)
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxx
```

### 3.2 ตั้งค่า Gmail App Password (สำหรับส่งอีเมล)
1. ไปที่ https://myaccount.google.com/security
2. เปิด **2-Step Verification** (ถ้ายังไม่เปิด)
3. ไปที่ https://myaccount.google.com/apppasswords
4. สร้าง App password → คัดลอกรหัส 16 ตัว ใส่ใน `SMTP_PASS`

### 3.3 สมัคร Groq API Key (สำหรับ AI Chatbot)
1. ไปที่ https://console.groq.com
2. Sign up → ไปที่ API Keys → Create API Key
3. คัดลอก key ใส่ใน `GROQ_API_KEY`

---

## ขั้นตอนที่ 4: ทดสอบในเครื่อง

```bash
cd vehicle-booking
npm run dev
```

เปิด http://localhost:3000 → Login ด้วย admin@example.com / admin1234

ทดสอบ:
1. เพิ่มรถยนต์ (จัดการรถยนต์)
2. เพิ่มผู้ใช้ (จัดการผู้ใช้) — สร้าง user, supervisor, approver
3. ขอใช้รถ → อนุมัติ → พิมพ์เอกสาร
4. ทดสอบ chatbot (ปุ่ม 💬 มุมขวาล่าง)

---

## ขั้นตอนที่ 5: แก้ไขชื่อหน่วยงาน

แก้ไขไฟล์เหล่านี้ เปลี่ยนชื่อหน่วยงาน:

| ไฟล์ | สิ่งที่ต้องแก้ |
|------|--------------|
| `src/app/layout.tsx` | title, description |
| `src/app/login/page.tsx` | ชื่อระบบในหน้า login |
| `src/app/register/page.tsx` | ชื่อระบบในหน้าสมัคร |
| `src/components/Navbar.tsx` | ชื่อใน navbar |
| `src/components/Footer.tsx` | ชื่อหน่วยงานใน footer |
| `src/components/PrintDocument.tsx` | หัวกระดาษเอกสาร A4 |
| `src/app/api/chat/route.ts` | ชื่อใน chatbot system prompt |

---

## ขั้นตอนที่ 6: Deploy ขึ้น Vercel

### 6.1 Push ขึ้น GitHub
```bash
cd vehicle-booking
git add .
git commit -m "ตั้งค่าระบบสำหรับหน่วยงาน"
git push
```

### 6.2 สมัคร Vercel และ Deploy
1. ไปที่ https://vercel.com → Sign up ด้วย GitHub
2. กด **Add New** → **Project**
3. เลือก repo `vehicle-booking` → กด **Import**
4. ตั้งค่า **Environment Variables** (ใส่ทีละตัว):

| Key | Value |
|-----|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL จาก Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key จาก Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role key จาก Supabase |
| `NEXT_PUBLIC_APP_URL` | (ใส่ทีหลังหลัง deploy ครั้งแรก) |
| `SMTP_HOST` | smtp.gmail.com |
| `SMTP_PORT` | 587 |
| `SMTP_USER` | อีเมลที่ใช้ส่ง |
| `SMTP_PASS` | app password |
| `SMTP_FROM` | noreply@หน่วยงาน.go.th |
| `GROQ_API_KEY` | key จาก Groq |

5. กด **Deploy** → รอ 1-2 นาที
6. ได้ URL เช่น `https://vehicle-booking-xxx.vercel.app`
7. กลับไปแก้ `NEXT_PUBLIC_APP_URL` ใน Vercel Settings → Environment Variables ใส่ URL จริง
8. กด **Redeploy** อีกครั้ง

---

## ขั้นตอนที่ 7: ใช้งานจริง

### เข้าสู่ระบบครั้งแรก
- URL: `https://vehicle-booking-xxx.vercel.app`
- อีเมล: `admin@example.com`
- รหัสผ่าน: `admin1234`

### สิ่งที่ต้องทำหลัง Deploy
1. ✅ เพิ่มกลุ่มงาน (จัดการกลุ่มงาน)
2. ✅ เพิ่มรถยนต์ (จัดการรถยนต์)
3. ✅ เพิ่มผู้ใช้ หรือให้สมัครผ่านหน้าเว็บ (admin อนุมัติ)
4. ✅ เปลี่ยนรหัสผ่าน admin

### บทบาทผู้ใช้
| บทบาท | สิทธิ์ |
|--------|--------|
| ผู้ใช้ทั่วไป (user) | ขอใช้รถ ดูสถานะ พิมพ์เอกสาร |
| ผู้บังคับบัญชาขั้นต้น (supervisor) | อนุมัติขั้นต้น |
| ผู้อนุมัติ (approver) | อนุมัติขั้นสุดท้าย เลือกรถ กำหนดผู้ขับ |
| ผู้ดูแลระบบ (admin) | จัดการทุกอย่าง |

---

## หมายเหตุสำคัญ

### Supabase Free Tier
- พื้นที่ 500 MB (ใช้ได้ ~10,000 รายการ)
- ⚠️ โปรเจคจะถูก pause หลังไม่มีการใช้งาน 7 วัน
- แก้ไข: ใช้ https://cron-job.org ตั้ง ping URL ทุกวัน

### Vercel Free Tier
- ใช้ได้ฟรีตลอด (Hobby plan)
- Bandwidth 100 GB/เดือน
- เหมาะสำหรับใช้งานภายในหน่วยงาน

### Groq Free Tier
- 30 requests/นาที
- เพียงพอสำหรับ chatbot ภายในหน่วยงาน

---

## การอัพเดทระบบ

เมื่อมีเวอร์ชันใหม่:
```bash
cd vehicle-booking
git pull origin main
npm install
npm run build
git push
```

Vercel จะ deploy ใหม่อัตโนมัติ

---

## ติดต่อผู้พัฒนา

พัฒนาระบบโดย นายศิวลักษณ์ เนตรสาร
นักวิชาการพัฒนาฝีมือแรงงานชำนาญการ
สถาบันพัฒนาฝีมือแรงงาน 7 อุบลราชธานี
