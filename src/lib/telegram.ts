import type { NewClientRequirement } from '../types'

// เรียก Vercel API Route — Token อยู่บน server ไม่หลุดมาฝั่ง browser
async function callNotifyAPI(text: string, isError = false): Promise<void> {
  const res = await fetch('/api/notify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, isError }),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(`Notify API error: ${JSON.stringify(err)}`)
  }
}

// แจ้ง admin เมื่อมี Lead ใหม่เข้ามาสำเร็จ
export async function sendTelegramNewLead(
  formData: NewClientRequirement
): Promise<void> {
  const now = new Date().toLocaleString('th-TH', {
    timeZone: 'Asia/Bangkok', dateStyle: 'short', timeStyle: 'short',
  })

  const text =
    `🔔 *Lead ใหม่เข้ามา!*\n\n` +
    `👤 *ชื่อ:* ${formData.client_name}\n` +
    `📞 *โทร:* ${formData.contact_info}\n` +
    `🛠 *ประเภทงาน:* ${formData.project_type}\n` +
    `💰 *งบประมาณ:* ${formData.budget}\n` +
    `⏰ *ต้องการภายใน:* ${formData.deadline || 'ไม่ระบุ'}\n` +
    `📝 *รายละเอียด:* ${formData.requirements.slice(0, 200)}\n\n` +
    `🕐 _${now}_`

  await callNotifyAPI(text).catch(e =>
    console.error('ส่ง Telegram ไม่ได้:', e)
  )
}

// แจ้ง admin เมื่อลูกค้า submit แล้วเกิด error (Supabase บันทึกไม่ได้)
// กรณีนี้ DB Trigger ช่วยไม่ได้ เพราะข้อมูลไม่ได้ลงฐานข้อมูลเลย
export async function sendTelegramErrorLog(
  formData: NewClientRequirement,
  error: unknown
): Promise<void> {
  const errorMessage = error instanceof Error ? error.message : String(error)
  const now = new Date().toLocaleString('th-TH', {
    timeZone: 'Asia/Bangkok', dateStyle: 'short', timeStyle: 'short',
  })

  const text =
    `🚨 *ERROR — ลูกค้าส่งฟอร์มไม่สำเร็จ*\n\n` +
    `👤 *ชื่อ:* ${formData.client_name || '(ว่าง)'}\n` +
    `📞 *ติดต่อ:* ${formData.contact_info || '(ว่าง)'}\n` +
    `💼 *ประเภทงาน:* ${formData.project_type || '(ว่าง)'}\n` +
    `💰 *งบประมาณ:* ${formData.budget || '(ว่าง)'}\n` +
    `📝 *รายละเอียด:* ${formData.requirements || '(ว่าง)'}\n\n` +
    `❌ *Error:*\n\`${errorMessage}\`\n\n` +
    `🕐 _เกิดเมื่อ: ${now}_`

  await callNotifyAPI(text, true).catch(e =>
    console.error('ส่ง error log ไม่ได้:', e)
  )
}
