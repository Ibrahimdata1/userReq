-- แก้ปัญหา RLS Policy
-- รันใน Supabase > SQL Editor > New Query

-- 1. ลบ policy เก่าถ้ามีอยู่
DROP POLICY IF EXISTS "allow_public_insert" ON client_requirements;

-- 2. สร้าง policy ใหม่ให้ anon (ผู้ใช้ทั่วไป) insert ได้
CREATE POLICY "allow_public_insert"
  ON client_requirements
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- 3. ให้ permission insert กับ anon role โดยตรง
GRANT INSERT ON client_requirements TO anon;
