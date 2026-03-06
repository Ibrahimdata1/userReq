import { useState, type FormEvent, type ChangeEvent, type FocusEvent } from 'react'
import { saveClientRequirement } from '../lib/supabase'
import { sendTelegramErrorLog } from '../lib/telegram'
import {
  PROJECT_TYPES, BUDGET_BY_PROJECT_TYPE, DEADLINE_OPTIONS,
  type NewClientRequirement,
} from '../types'

type FormStatus = 'idle' | 'loading' | 'success' | 'error' | 'cooldown'

type FormErrors = Partial<Record<keyof NewClientRequirement, string>>

const INITIAL_FORM: NewClientRequirement = {
  client_name: '',
  contact_info: '',
  project_type: '',
  budget: '',
  requirements: '',
  deadline: null,
  reference_url: null,
  has_existing_system: false,
}

const COOLDOWN_MS = 3 * 60 * 1000 // 3 นาที
const STORAGE_KEY = 'last_submit_time'

function isValidPhone(value: string) {
  return /^\d{9,10}$/.test(value.replace(/\D/g, ''))
}

function validate(form: NewClientRequirement): FormErrors {
  const e: FormErrors = {}
  if (!form.client_name.trim())       e.client_name   = 'กรุณากรอกชื่อ-นามสกุล หรือชื่อบริษัท'
  if (!form.contact_info.trim())      e.contact_info  = 'กรุณากรอกเบอร์โทรศัพท์'
  else if (!isValidPhone(form.contact_info)) e.contact_info = 'เบอร์โทรต้องเป็นตัวเลข 9-10 หลัก'
  if (!form.project_type)             e.project_type  = 'กรุณาเลือกประเภทของงาน'
  if (!form.budget)                   e.budget        = 'กรุณาเลือกช่วงงบประมาณ'
  if (!form.deadline)                 e.deadline      = 'กรุณาเลือกกำหนดส่งงานที่ต้องการ'
  if (!form.requirements.trim())      e.requirements  = 'กรุณาบอกว่าอยากได้อะไร เขียนแบบไหนก็ได้ครับ'
  return e
}

function inputClass(hasError: boolean) {
  return [
    'w-full rounded-lg px-4 py-3 text-sm transition focus:outline-none focus:ring-2 focus:border-transparent',
    'bg-[#0d1117] border text-gray-200 placeholder-gray-500',
    hasError
      ? 'border-red-500/60 focus:ring-red-500/40'
      : 'border-gray-700/60 focus:ring-emerald-500/40 hover:border-gray-600',
  ].join(' ')
}

function TerminalDots() {
  return (
    <div className="flex items-center gap-1.5 mb-4">
      <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
      <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
      <span className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
    </div>
  )
}

function ErrorMsg({ msg }: { msg?: string }) {
  if (!msg) return null
  return (
    <p className="mt-1.5 text-xs text-red-400 flex items-center gap-1">
      <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
      {msg}
    </p>
  )
}

function SectionLabel({ children, required = true }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-sm font-medium text-gray-300 mb-1.5">
      {children} {required && <span className="text-emerald-400">*</span>}
    </label>
  )
}

export default function LeadForm() {
  const [form, setForm]       = useState<NewClientRequirement>(INITIAL_FORM)
  const [errors, setErrors]   = useState<FormErrors>({})
  const [touched, setTouched] = useState<Partial<Record<keyof NewClientRequirement, boolean>>>({})
  const [status, setStatus]   = useState<FormStatus>('idle')
  const [cooldownSec, setCooldownSec] = useState(0)

  const isLoading = status === 'loading'
  const budgetOptions = form.project_type ? (BUDGET_BY_PROJECT_TYPE[form.project_type] ?? []) : []

  function handleChange(e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value, type } = e.target
    const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    // ถ้าเปลี่ยนประเภทงาน ให้ล้างงบประมาณที่เลือกไว้
    const updated = name === 'project_type'
      ? { ...form, project_type: value as string, budget: '' }
      : { ...form, [name]: val }
    setForm(updated)
    if (touched[name as keyof NewClientRequirement]) setErrors(validate(updated))
  }

  function handleBlur(e: FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const name = e.target.name as keyof NewClientRequirement
    setTouched(prev => ({ ...prev, [name]: true }))
    setErrors(validate(form))
  }

  function startCooldown() {
    const endTime = Date.now() + COOLDOWN_MS
    localStorage.setItem(STORAGE_KEY, String(endTime))
    const tick = () => {
      const remaining = Math.ceil((endTime - Date.now()) / 1000)
      if (remaining <= 0) { setStatus('idle'); setCooldownSec(0); return }
      setCooldownSec(remaining)
      setTimeout(tick, 1000)
    }
    setStatus('cooldown')
    tick()
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()

    // เช็ค cooldown
    const lastSubmit = Number(localStorage.getItem(STORAGE_KEY) || 0)
    if (Date.now() < lastSubmit) { startCooldown(); return }

    setTouched({ client_name: true, contact_info: true, project_type: true, budget: true, deadline: true, requirements: true })
    const errs = validate(form)
    setErrors(errs)
    if (Object.keys(errs).length > 0) return

    setStatus('loading')

    try {
      await saveClientRequirement(form)
      // DB Trigger (pg_net) จัดการส่ง Telegram อัตโนมัติ ไม่ต้องทำอะไรเพิ่ม
      setStatus('success')
      setForm(INITIAL_FORM)
      setTouched({})
      setErrors({})
      startCooldown()
    } catch (err) {
      console.error('Submit error:', err)
      sendTelegramErrorLog(form, err)
      setStatus('error')
    }
  }

  // --- หน้า Success ---
  if (status === 'success' || status === 'cooldown') {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4 relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="bg-[#12121a] border border-gray-800/60 rounded-xl p-10 max-w-md w-full text-center relative z-10">
          <TerminalDots />
          <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-5">
            <svg className="w-10 h-10 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">ขอบคุณมากครับ/ค่ะ!</h2>
          <p className="text-gray-400 leading-relaxed mb-6">
            ทีมงานได้รับข้อมูลแล้ว จะติดต่อกลับภายใน{' '}
            <span className="font-semibold text-emerald-400">24 ชั่วโมง</span>
          </p>
          {status === 'cooldown' && cooldownSec > 0 && (
            <p className="text-sm text-gray-500">
              ส่งข้อมูลใหม่ได้ในอีก {cooldownSec} วินาที
            </p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] py-10 px-4 relative overflow-hidden">
      {/* Background ambient effects */}
      <div className="absolute top-20 left-1/4 w-2 h-2 bg-emerald-400/30 rounded-full" />
      <div className="absolute top-40 right-1/3 w-1.5 h-1.5 bg-emerald-400/20 rounded-full" />
      <div className="absolute bottom-32 left-1/3 w-1 h-1 bg-gray-500/30 rounded-full" />
      <div className="absolute top-60 right-1/4 w-1.5 h-1.5 bg-gray-500/20 rounded-full" />
      <div className="absolute bottom-60 right-1/5 w-2 h-2 bg-emerald-400/15 rounded-full" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-emerald-500/[0.03] rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-2xl mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <p className="text-sm font-mono text-gray-500 mb-3 tracking-wider">// new project</p>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">เริ่มโปรเจกต์ของคุณ</h1>
          <p className="text-gray-400">กรอกข้อมูลด้านล่าง ทีมงานจะติดต่อกลับภายใน 24 ชั่วโมง</p>
          <div className="mt-4 inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-sm text-emerald-400">พร้อมรับงาน</span>
          </div>
        </div>

        {/* Form Card */}
        <form onSubmit={handleSubmit} noValidate
          className="bg-[#12121a] border border-gray-800/60 rounded-xl p-6 md:p-8 space-y-6">

          <TerminalDots />

          {/* ชื่อ */}
          <div>
            <SectionLabel>ชื่อ-นามสกุล / ชื่อบริษัท</SectionLabel>
            <input type="text" name="client_name" value={form.client_name}
              onChange={handleChange} onBlur={handleBlur} disabled={isLoading}
              placeholder="เช่น สมชาย ใจดี หรือ บริษัท XYZ จำกัด"
              className={inputClass(!!errors.client_name)} />
            <ErrorMsg msg={errors.client_name} />
          </div>

          {/* เบอร์โทร */}
          <div>
            <SectionLabel>เบอร์โทรศัพท์ติดต่อ</SectionLabel>
            <input type="tel" name="contact_info" value={form.contact_info}
              onChange={handleChange} onBlur={handleBlur} disabled={isLoading}
              placeholder="เช่น 0812345678"
              className={inputClass(!!errors.contact_info)} />
            <ErrorMsg msg={errors.contact_info} />
          </div>

          {/* ประเภทงาน */}
          <div>
            <SectionLabel>ประเภทของงาน</SectionLabel>
            <select name="project_type" value={form.project_type}
              onChange={handleChange} onBlur={handleBlur} disabled={isLoading}
              className={inputClass(!!errors.project_type)}>
              <option value="">-- เลือกประเภทงาน --</option>
              {PROJECT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <ErrorMsg msg={errors.project_type} />
          </div>

          {/* มีระบบเก่าอยู่แล้วไหม */}
          <div>
            <SectionLabel>มีเว็บไซต์/ระบบเก่าอยู่แล้วหรือไม่?</SectionLabel>
            <div className="flex gap-3">
              {([false, true] as const).map(val => (
                <label key={String(val)} className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border cursor-pointer transition-all ${
                  form.has_existing_system === val
                    ? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-400 font-medium'
                    : 'border-gray-700/60 bg-[#0d1117] text-gray-400 hover:border-gray-600'
                }`}>
                  <input type="radio" name="has_existing_system"
                    value={String(val)}
                    checked={form.has_existing_system === val}
                    onChange={() => setForm(p => ({ ...p, has_existing_system: val }))}
                    className="accent-emerald-500" />
                  {val ? 'มีอยู่แล้ว' : 'ยังไม่มี'}
                </label>
              ))}
            </div>
          </div>

          {/* งบประมาณ */}
          <div>
            <SectionLabel>ช่วงงบประมาณที่ต้องการ</SectionLabel>
            {!form.project_type ? (
              <p className="text-sm text-gray-500 italic py-3 px-4 bg-[#0d1117] rounded-lg border border-dashed border-gray-700/60">
                กรุณาเลือกประเภทงานก่อน แล้วงบประมาณจะแสดงให้เองครับ
              </p>
            ) : (
              <div className="space-y-2">
                {budgetOptions.map(range => (
                  <label key={range} className={`flex items-start gap-3 p-3.5 rounded-lg border cursor-pointer transition-all ${
                    isLoading ? 'opacity-60 cursor-not-allowed' : ''
                  } ${
                    form.budget === range
                      ? 'border-emerald-500/60 bg-emerald-500/10'
                      : errors.budget ? 'border-red-500/40 bg-red-500/5' : 'border-gray-700/60 bg-[#0d1117] hover:border-gray-600'
                  }`}>
                    <input type="radio" name="budget" value={range}
                      checked={form.budget === range}
                      onChange={handleChange} disabled={isLoading}
                      className="mt-0.5 accent-emerald-500 shrink-0" />
                    <span className="text-sm text-gray-300 leading-relaxed">{range}</span>
                  </label>
                ))}
              </div>
            )}
            <ErrorMsg msg={errors.budget} />
          </div>

          {/* กำหนดส่งงาน */}
          <div>
            <SectionLabel>กำหนดส่งงานที่ต้องการ</SectionLabel>
            <select name="deadline" value={form.deadline ?? ''}
              onChange={e => setForm(p => ({ ...p, deadline: e.target.value || null }))}
              onBlur={handleBlur} disabled={isLoading}
              className={inputClass(!!errors.deadline)}>
              <option value="">-- เลือกระยะเวลา --</option>
              {DEADLINE_OPTIONS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <ErrorMsg msg={errors.deadline} />
          </div>

          {/* เว็บอ้างอิง */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              เว็บไซต์อ้างอิงที่ชอบ <span className="text-gray-500 font-normal">(ไม่บังคับ)</span>
            </label>
            <input type="url" name="reference_url" value={form.reference_url ?? ''}
              onChange={e => setForm(p => ({ ...p, reference_url: e.target.value || null }))}
              disabled={isLoading}
              placeholder="เช่น https://example.com"
              className={inputClass(false)} />
            <p className="mt-1 text-xs text-gray-500">ใส่เว็บที่ชอบ style หรือ feature ทีมจะได้เข้าใจได้เร็วขึ้น</p>
          </div>

          {/* รายละเอียด */}
          <div>
            <SectionLabel>อยากได้อะไรบ้าง? บอกเราได้เลย</SectionLabel>
            <p className="text-xs text-gray-500 mb-2">ไม่ต้องใช้ภาษาเทคนิค เขียนแบบคุยกันเองก็ได้ครับ</p>
            <textarea name="requirements" value={form.requirements}
              onChange={handleChange} onBlur={handleBlur} disabled={isLoading} rows={5}
              placeholder="เช่น อยากได้เว็บขายของ มีรูปสินค้า ลูกค้ากดสั่งได้ จ่ายเงินผ่านบัตรได้ และมีหน้าให้เราจัดการออเดอร์"
              className={inputClass(!!errors.requirements) + ' resize-none'} />
            <ErrorMsg msg={errors.requirements} />
          </div>

          {/* Submit Error */}
          {status === 'error' && (
            <div className="bg-orange-500/5 border border-orange-500/20 rounded-lg p-5 space-y-3">
              <div className="flex items-start gap-3">
                <span className="text-2xl shrink-0">:(</span>
                <div>
                  <p className="font-semibold text-gray-200 text-sm">ขออภัย ส่งข้อมูลไม่สำเร็จในขณะนี้</p>
                  <p className="text-sm text-gray-400 mt-1">
                    อาจเกิดจากสัญญาณอินเทอร์เน็ต หรือระบบกำลังปรับปรุงชั่วคราว
                    กรุณาลองใหม่อีกครั้ง หรือติดต่อทีมงานโดยตรงได้เลยครับ
                  </p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <a href="https://www.facebook.com/YOUR_PAGE_NAME" target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 bg-blue-600/20 border border-blue-500/30 text-blue-400 text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-blue-600/30 transition-colors">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                  Facebook Page
                </a>
                <a href="https://line.me/ti/p/~YOUR_LINE_ID" target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 bg-green-600/20 border border-green-500/30 text-green-400 text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-green-600/30 transition-colors">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.070 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
                  </svg>
                  LINE Official
                </a>
              </div>
            </div>
          )}

          <button type="submit" disabled={isLoading}
            className="w-full bg-emerald-500 text-gray-900 py-3.5 rounded-lg font-semibold text-base hover:bg-emerald-400 active:bg-emerald-600 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/10">
            {isLoading ? (
              <>
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                กำลังดำเนินการ...
              </>
            ) : 'ส่งข้อมูลขอใบเสนอราคา'}
          </button>

          <p className="text-center text-xs text-gray-600">
            ข้อมูลของคุณจะถูกเก็บเป็นความลับ และใช้เพื่อประเมินราคาเท่านั้น
          </p>
        </form>

        {/* Footer branding */}
        <p className="text-center text-xs text-gray-600 mt-6">
          Powered by <span className="text-gray-400 font-medium">FarAways</span><span className="text-emerald-400 font-medium">Tech</span>
        </p>
      </div>
    </div>
  )
}
