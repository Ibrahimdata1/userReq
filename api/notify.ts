import type { VercelRequest, VercelResponse } from '@vercel/node'

// ไฟล์นี้รันบน Vercel Server เท่านั้น — browser ไม่เคยเห็น Token นี้
const BOT_TOKEN   = process.env.TELEGRAM_BOT_TOKEN
const CHAT_ID     = process.env.TELEGRAM_CHAT_ID
const ERROR_CHAT  = process.env.TELEGRAM_ERROR_CHAT_ID

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { text, isError } = req.body as { text: string; isError?: boolean }

  if (!text) return res.status(400).json({ error: 'Missing text' })
  if (!BOT_TOKEN || !CHAT_ID) return res.status(500).json({ error: 'Telegram ยังไม่ได้ตั้งค่า' })

  const chatId = isError ? (ERROR_CHAT || CHAT_ID) : CHAT_ID

  const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' }),
  })

  if (!response.ok) {
    const err = await response.json()
    return res.status(502).json({ error: err })
  }

  return res.status(200).json({ ok: true })
}
