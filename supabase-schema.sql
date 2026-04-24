-- =============================================
-- ระบบขอใช้รถยนต์ราชการ
-- สถาบันพัฒนาฝีมือแรงงาน 7 อุบลราชธานี
-- =============================================

-- ตารางผู้ใช้
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  position TEXT NOT NULL,
  department TEXT NOT NULL CHECK (department IN (
    'ฝ่ายบริหารทั่วไป',
    'กลุ่มงานพัฒนาฝีมือแรงงาน',
    'กลุ่มงานมาตรฐานฝีมือแรงงานและรับรองความรู้ความสามารถ',
    'กลุ่มงานแผนงานและสารสนเทศ'
  )),
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'supervisor', 'approver', 'admin')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ตารางรถยนต์
CREATE TABLE vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plate_number TEXT UNIQUE NOT NULL,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  vehicle_type TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ตารางคำขอใช้รถ
CREATE TABLE vehicle_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID REFERENCES users(id) NOT NULL,
  request_date DATE NOT NULL DEFAULT CURRENT_DATE,
  departure_datetime TIMESTAMPTZ NOT NULL,
  return_datetime TIMESTAMPTZ NOT NULL,
  destination TEXT NOT NULL,
  purpose TEXT NOT NULL,

  -- สถานะอนุมัติ
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'supervisor_approved', 'approved', 'rejected')),

  -- ผู้บังคับบัญชาขั้นต้น
  supervisor_id UUID REFERENCES users(id),
  supervisor_approved_at TIMESTAMPTZ,
  supervisor_comment TEXT,

  -- ผู้อนุมัติ
  approver_id UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  approver_comment TEXT,

  -- รถและผู้ขับที่อนุมัติ
  approved_vehicle_id UUID REFERENCES vehicles(id),
  approved_driver_name TEXT,

  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_requests_requester ON vehicle_requests(requester_id);
CREATE INDEX idx_requests_status ON vehicle_requests(status);
CREATE INDEX idx_requests_supervisor ON vehicle_requests(supervisor_id);
CREATE INDEX idx_requests_approver ON vehicle_requests(approver_id);

-- RLS Policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_requests ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read
CREATE POLICY "users_read" ON users FOR SELECT USING (true);
CREATE POLICY "vehicles_read" ON vehicles FOR SELECT USING (true);
CREATE POLICY "requests_read" ON vehicle_requests FOR SELECT USING (true);

-- Allow inserts/updates via service role (API routes)
CREATE POLICY "users_admin" ON users FOR ALL USING (true);
CREATE POLICY "vehicles_admin" ON vehicles FOR ALL USING (true);
CREATE POLICY "requests_all" ON vehicle_requests FOR ALL USING (true);
