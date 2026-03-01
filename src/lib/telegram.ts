import type { NewClientRequirement } from '../types'
import { saveErrorLog } from './supabase'

// แจ้ง admin เมื่อลูกค้า submit แล้วเกิด error
// บันทึกลง error_logs → DB Trigger → Vault → Telegram อัตโนมัติ
export async function sendTelegramErrorLog(
  formData: NewClientRequirement,
  error: unknown
): Promise<void> {
  const errorMessage = error instanceof Error ? error.message : String(error)
  await saveErrorLog(
    formData.client_name,
    formData.contact_info,
    errorMessage
  ).catch(e => console.error('บันทึก error log ไม่ได้:', e))
}
