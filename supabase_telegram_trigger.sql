-- ===================================================
-- DB Trigger: แจ้ง Telegram เมื่อมี Lead ใหม่
-- รันใน Supabase > SQL Editor > New Query > Run
-- ===================================================

-- 1. เปิด pg_net extension (ถ้ายังไม่ได้เปิด)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. สร้าง Function สำหรับส่ง Telegram
CREATE OR REPLACE FUNCTION notify_telegram_new_lead()
RETURNS TRIGGER AS $$
DECLARE
  msg TEXT;
BEGIN
  msg := '🔔 *Lead ใหม่เข้ามา!*' || chr(10) ||
         '👤 *ชื่อ:* ' || NEW.client_name || chr(10) ||
         '📞 *โทร:* ' || NEW.contact_info || chr(10) ||
         '🛠 *ประเภทงาน:* ' || NEW.project_type || chr(10) ||
         '💰 *งบประมาณ:* ' || NEW.budget || chr(10) ||
         '⏰ *ต้องการภายใน:* ' || COALESCE(NEW.deadline, 'ไม่ระบุ') || chr(10) ||
         '📝 *รายละเอียด:* ' || LEFT(NEW.requirements, 200);

  PERFORM net.http_post(
    url     := 'https://smart-requirement.vercel.app/api/notify',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body    := jsonb_build_object('text', msg)
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. ผูก Trigger กับตาราง
DROP TRIGGER IF EXISTS on_new_lead_notify ON client_requirements;

CREATE TRIGGER on_new_lead_notify
  AFTER INSERT ON client_requirements
  FOR EACH ROW
  EXECUTE FUNCTION notify_telegram_new_lead();
