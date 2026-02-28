-- รันใน Supabase > SQL Editor
-- Migration: เพิ่มคอลัมน์ใหม่ + เปิด SELECT/UPDATE ให้ anon สำหรับ Admin Dashboard

ALTER TABLE client_requirements
  ADD COLUMN IF NOT EXISTS status            VARCHAR DEFAULT 'new' NOT NULL,
  ADD COLUMN IF NOT EXISTS deadline          VARCHAR DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS reference_url     VARCHAR DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS has_existing_system BOOLEAN DEFAULT false NOT NULL;

-- เปิด SELECT ให้ anon (สำหรับ Admin Dashboard)
CREATE POLICY "allow_anon_select"
  ON client_requirements
  FOR SELECT TO anon
  USING (true);

-- เปิด UPDATE ให้ anon (สำหรับเปลี่ยน status ใน Admin)
CREATE POLICY "allow_anon_update"
  ON client_requirements
  FOR UPDATE TO anon
  USING (true) WITH CHECK (true);

GRANT SELECT, UPDATE ON client_requirements TO anon;
