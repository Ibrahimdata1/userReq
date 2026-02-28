-- รัน SQL นี้ใน Supabase > SQL Editor เพื่อสร้างตาราง
-- ขั้นตอน: เปิด Supabase > เลือกโปรเจกต์ > SQL Editor > New Query > วางโค้ดนี้ > Run

CREATE TABLE IF NOT EXISTS client_requirements (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name VARCHAR     NOT NULL,
  contact_info VARCHAR    NOT NULL,
  project_type VARCHAR    NOT NULL,
  budget      VARCHAR     NOT NULL,
  requirements TEXT       NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- เปิดให้ส่งข้อมูลได้โดยไม่ต้อง login (ลูกค้า anonymous)
ALTER TABLE client_requirements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_public_insert"
  ON client_requirements
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- หมายเหตุ: ถ้าต้องการให้ดูข้อมูลใน Dashboard ได้ ให้รันเพิ่ม:
-- CREATE POLICY "allow_authenticated_select"
--   ON client_requirements
--   FOR SELECT
--   TO authenticated
--   USING (true);
