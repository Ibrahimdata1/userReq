import { createClient } from '@supabase/supabase-js'
import type { ClientRequirement, NewClientRequirement, LeadStatus } from '../types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// บันทึก lead ใหม่
export async function saveClientRequirement(
  data: NewClientRequirement
): Promise<ClientRequirement> {
  const { error } = await supabase
    .from('client_requirements')
    .insert([data])

  if (error) throw new Error(`บันทึกข้อมูลไม่สำเร็จ: ${error.message}`)

  return {
    ...data,
    id: crypto.randomUUID(),
    status: 'new',
    created_at: new Date().toISOString(),
  }
}

// Auth: login สำหรับ Admin
export async function adminSignIn(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw new Error('อีเมลหรือรหัสผ่านไม่ถูกต้อง')
}

export async function adminSignOut() {
  await supabase.auth.signOut()
}

export function onAuthChange(callback: (loggedIn: boolean) => void) {
  return supabase.auth.onAuthStateChange((_event, session) => {
    callback(!!session)
  })
}

// ดึง leads ทั้งหมด (สำหรับ Admin)
export async function fetchAllLeads(): Promise<ClientRequirement[]> {
  const { data, error } = await supabase
    .from('client_requirements')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw new Error(`โหลดข้อมูลไม่สำเร็จ: ${error.message}`)
  return data as ClientRequirement[]
}

// เปลี่ยน status ของ lead
export async function updateLeadStatus(id: string, status: LeadStatus): Promise<void> {
  const { error } = await supabase
    .from('client_requirements')
    .update({ status })
    .eq('id', id)

  if (error) throw new Error(`อัปเดต status ไม่สำเร็จ: ${error.message}`)
}
