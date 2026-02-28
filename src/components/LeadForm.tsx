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
    'w-full rounded-xl px-4 py-3 text-sm transition focus:outline-none focus:ring-2 focus:border-transparent placeholder-gray-400',
    hasError ? 'border-2 border-red-400 focus:ring-red-300 bg-red-50' : 'border border-gray-300 focus:ring-indigo-400',
  ].join(' ')
}

function ErrorMsg({ msg }: { msg?: string }) {
  if (!msg) return null
  return (
    <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
      <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
      {msg}
    </p>
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
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-10 max-w-md w-full text-center">
          <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5 animate-bounce">
            <svg className="w-12 h-12 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">ขอบคุณมากครับ/ค่ะ!</h2>
          <p className="text-gray-500 leading-relaxed mb-6">
            ทีมงานได้รับข้อมูลแล้ว จะติดต่อกลับภายใน{' '}
            <span className="font-semibold text-indigo-600">24 ชั่วโมง</span>
          </p>
          {status === 'cooldown' && cooldownSec > 0 && (
            <p className="text-sm text-gray-400">
              ส่งข้อมูลใหม่ได้ในอีก {cooldownSec} วินาที
            </p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-100 py-10 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-600 rounded-2xl mb-4 shadow-lg">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-800">ขอใบเสนอราคาโปรเจกต์</h1>
          <p className="text-gray-500 mt-2">กรอกข้อมูลด้านล่าง ทีมงานจะติดต่อกลับภายใน 24 ชั่วโมง</p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="bg-white rounded-2xl shadow-lg p-6 md:p-8 space-y-6">

          {/* ชื่อ */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              ชื่อ-นามสกุล / ชื่อบริษัท <span className="text-red-500">*</span>
            </label>
            <input type="text" name="client_name" value={form.client_name}
              onChange={handleChange} onBlur={handleBlur} disabled={isLoading}
              placeholder="เช่น สมชาย ใจดี หรือ บริษัท XYZ จำกัด"
              className={inputClass(!!errors.client_name)} />
            <ErrorMsg msg={errors.client_name} />
          </div>

          {/* เบอร์โทร */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              เบอร์โทรศัพท์ติดต่อ <span className="text-red-500">*</span>
            </label>
            <input type="tel" name="contact_info" value={form.contact_info}
              onChange={handleChange} onBlur={handleBlur} disabled={isLoading}
              placeholder="เช่น 0812345678"
              className={inputClass(!!errors.contact_info)} />
            <ErrorMsg msg={errors.contact_info} />
          </div>

          {/* ประเภทงาน */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              ประเภทของงาน <span className="text-red-500">*</span>
            </label>
            <select name="project_type" value={form.project_type}
              onChange={handleChange} onBlur={handleBlur} disabled={isLoading}
              className={inputClass(!!errors.project_type) + ' bg-white'}>
              <option value="">-- เลือกประเภทงาน --</option>
              {PROJECT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <ErrorMsg msg={errors.project_type} />
          </div>

          {/* มีระบบเก่าอยู่แล้วไหม */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              มีเว็บไซต์/ระบบเก่าอยู่แล้วหรือไม่? <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-3">
              {([false, true] as const).map(val => (
                <label key={String(val)} className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                  form.has_existing_system === val
                    ? 'border-indigo-500 bg-indigo-50 font-medium text-indigo-700'
                    : 'border-gray-200 hover:border-indigo-300'
                }`}>
                  <input type="radio" name="has_existing_system"
                    value={String(val)}
                    checked={form.has_existing_system === val}
                    onChange={() => setForm(p => ({ ...p, has_existing_system: val }))}
                    className="accent-indigo-600" />
                  {val ? '✅ มีอยู่แล้ว' : '❌ ยังไม่มี'}
                </label>
              ))}
            </div>
          </div>

          {/* งบประมาณ */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              ช่วงงบประมาณที่ต้องการ <span className="text-red-500">*</span>
            </label>
            {!form.project_type ? (
              <p className="text-sm text-gray-400 italic py-3 px-4 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                กรุณาเลือกประเภทงานก่อน แล้วงบประมาณจะแสดงให้เองครับ
              </p>
            ) : (
              <div className="space-y-2">
                {budgetOptions.map(range => (
                  <label key={range} className={`flex items-start gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                    isLoading ? 'opacity-60 cursor-not-allowed' : ''
                  } ${
                    form.budget === range
                      ? 'border-indigo-500 bg-indigo-50'
                      : errors.budget ? 'border-red-300 bg-red-50' : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'
                  }`}>
                    <input type="radio" name="budget" value={range}
                      checked={form.budget === range}
                      onChange={handleChange} disabled={isLoading}
                      className="mt-0.5 accent-indigo-600 shrink-0" />
                    <span className="text-sm text-gray-700 leading-relaxed">{range}</span>
                  </label>
                ))}
              </div>
            )}
            <ErrorMsg msg={errors.budget} />
          </div>

          {/* กำหนดส่งงาน */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              กำหนดส่งงานที่ต้องการ <span className="text-red-500">*</span>
            </label>
            <select name="deadline" value={form.deadline ?? ''}
              onChange={e => setForm(p => ({ ...p, deadline: e.target.value || null }))}
              onBlur={handleBlur} disabled={isLoading}
              className={inputClass(!!errors.deadline) + ' bg-white'}>
              <option value="">-- เลือกระยะเวลา --</option>
              {DEADLINE_OPTIONS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <ErrorMsg msg={errors.deadline} />
          </div>

          {/* เว็บอ้างอิง */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              เว็บไซต์อ้างอิงที่ชอบ <span className="text-gray-400 font-normal">(ไม่บังคับ)</span>
            </label>
            <input type="url" name="reference_url" value={form.reference_url ?? ''}
              onChange={e => setForm(p => ({ ...p, reference_url: e.target.value || null }))}
              disabled={isLoading}
              placeholder="เช่น https://example.com"
              className={inputClass(false)} />
            <p className="mt-1 text-xs text-gray-400">ใส่เว็บที่ชอบ style หรือ feature ทีมจะได้เข้าใจได้เร็วขึ้น</p>
          </div>

          {/* รายละเอียด */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              อยากได้อะไรบ้าง? บอกเราได้เลย <span className="text-red-500">*</span>
            </label>
            <p className="text-xs text-gray-400 mb-2">ไม่ต้องใช้ภาษาเทคนิค เขียนแบบคุยกันเองก็ได้ครับ</p>
            <textarea name="requirements" value={form.requirements}
              onChange={handleChange} onBlur={handleBlur} disabled={isLoading} rows={5}
              placeholder="เช่น อยากได้เว็บขายของ มีรูปสินค้า ลูกค้ากดสั่งได้ จ่ายเงินผ่านบัตรได้ และมีหน้าให้เราจัดการออเดอร์"
              className={inputClass(!!errors.requirements) + ' resize-none'} />
            <ErrorMsg msg={errors.requirements} />
          </div>

          {/* Submit Error */}
          {status === 'error' && (
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-5 space-y-3">
              <div className="flex items-start gap-3">
                <span className="text-2xl shrink-0">😓</span>
                <div>
                  <p className="font-semibold text-gray-800 text-sm">ขออภัย ส่งข้อมูลไม่สำเร็จในขณะนี้</p>
                  <p className="text-sm text-gray-600 mt-1">
                    อาจเกิดจากสัญญาณอินเทอร์เน็ต หรือระบบกำลังปรับปรุงชั่วคราว
                    กรุณาลองใหม่อีกครั้ง หรือติดต่อทีมงานโดยตรงได้เลยครับ
                  </p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <a href="https://www.facebook.com/YOUR_PAGE_NAME" target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 bg-blue-600 text-white text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-blue-700 transition-colors">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                  Facebook Page
                </a>
                <a href="https://line.me/ti/p/~YOUR_LINE_ID" target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 bg-green-500 text-white text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-green-600 transition-colors">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.070 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
                  </svg>
                  LINE Official
                </a>
              </div>
            </div>
          )}

          <button type="submit" disabled={isLoading}
            className="w-full bg-indigo-600 text-white py-3.5 rounded-xl font-semibold text-base hover:bg-indigo-700 active:bg-indigo-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md shadow-indigo-200">
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

          <p className="text-center text-xs text-gray-400">
            ข้อมูลของคุณจะถูกเก็บเป็นความลับ และใช้เพื่อประเมินราคาเท่านั้น
          </p>
        </form>
      </div>
    </div>
  )
}
