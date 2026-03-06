import { useState, type FormEvent, type ChangeEvent, type FocusEvent } from 'react'
import { saveClientRequirement } from '../lib/supabase'
import { sendTelegramErrorLog } from '../lib/telegram'
import {
  PROJECT_TYPES, BUDGET_BY_PROJECT_TYPE, DEADLINE_OPTIONS,
  type NewClientRequirement,
} from '../types'

type FormStatus = 'idle' | 'loading' | 'success' | 'error' | 'cooldown'
type FormErrors = Partial<Record<keyof NewClientRequirement, string>>
type Lang = 'th' | 'en'

// ─── i18n ───────────────────────────────────────────────
const t = {
  th: {
    headerComment: '// new project',
    headerTitle: 'เริ่มโปรเจกต์ของคุณ',
    headerSubtitle: 'กรอกข้อมูลด้านล่าง ทีมงานจะติดต่อกลับภายใน 24 ชั่วโมง',
    statusBadge: 'พร้อมรับงาน',
    labelName: 'ชื่อ-นามสกุล / ชื่อบริษัท',
    placeholderName: 'เช่น สมชาย ใจดี หรือ บริษัท XYZ จำกัด',
    labelPhone: 'เบอร์โทรศัพท์ติดต่อ',
    placeholderPhone: 'เช่น 0812345678',
    labelProjectType: 'ประเภทของงาน',
    selectProjectType: '-- เลือกประเภทงาน --',
    labelExisting: 'มีเว็บไซต์/ระบบเก่าอยู่แล้วหรือไม่?',
    existingYes: 'มีอยู่แล้ว',
    existingNo: 'ยังไม่มี',
    labelBudget: 'ช่วงงบประมาณที่ต้องการ',
    budgetHint: 'กรุณาเลือกประเภทงานก่อน แล้วงบประมาณจะแสดงให้เองครับ',
    labelDeadline: 'กำหนดส่งงานที่ต้องการ',
    selectDeadline: '-- เลือกระยะเวลา --',
    labelRef: 'เว็บไซต์อ้างอิงที่ชอบ',
    labelRefOptional: '(ไม่บังคับ)',
    placeholderRef: 'เช่น https://example.com',
    refHint: 'ใส่เว็บที่ชอบ style หรือ feature ทีมจะได้เข้าใจได้เร็วขึ้น',
    labelRequirements: 'อยากได้อะไรบ้าง? บอกเราได้เลย',
    requirementsHint: 'ไม่ต้องใช้ภาษาเทคนิค เขียนแบบคุยกันเองก็ได้ครับ',
    placeholderRequirements: 'เช่น อยากได้เว็บขายของ มีรูปสินค้า ลูกค้ากดสั่งได้ จ่ายเงินผ่านบัตรได้ และมีหน้าให้เราจัดการออเดอร์',
    submitBtn: 'ส่งข้อมูลขอใบเสนอราคา',
    submitting: 'กำลังดำเนินการ...',
    privacyNote: 'ข้อมูลของคุณจะถูกเก็บเป็นความลับ และใช้เพื่อประเมินราคาเท่านั้น',
    successTitle: 'ขอบคุณมากครับ/ค่ะ!',
    successMsg: 'ทีมงานได้รับข้อมูลแล้ว จะติดต่อกลับภายใน',
    successTime: '24 ชั่วโมง',
    cooldownMsg: (s: number) => `ส่งข้อมูลใหม่ได้ในอีก ${s} วินาที`,
    errorTitle: 'ขออภัย ส่งข้อมูลไม่สำเร็จในขณะนี้',
    errorMsg: 'อาจเกิดจากสัญญาณอินเทอร์เน็ต หรือระบบกำลังปรับปรุงชั่วคราว กรุณาลองใหม่อีกครั้ง หรือติดต่อทีมงานโดยตรงได้เลยครับ',
    errName: 'กรุณากรอกชื่อ-นามสกุล หรือชื่อบริษัท',
    errPhone: 'กรุณากรอกเบอร์โทรศัพท์',
    errPhoneFormat: 'เบอร์โทรต้องเป็นตัวเลข 9-10 หลัก',
    errProjectType: 'กรุณาเลือกประเภทของงาน',
    errBudget: 'กรุณาเลือกช่วงงบประมาณ',
    errDeadline: 'กรุณาเลือกกำหนดส่งงานที่ต้องการ',
    errRequirements: 'กรุณาบอกว่าอยากได้อะไร เขียนแบบไหนก็ได้ครับ',
  },
  en: {
    headerComment: '// new project',
    headerTitle: 'Start Your Project',
    headerSubtitle: 'Fill in the details below. Our team will get back to you within 24 hours.',
    statusBadge: 'Available',
    labelName: 'Full Name / Company Name',
    placeholderName: 'e.g. John Doe or Acme Corp Ltd.',
    labelPhone: 'Phone Number',
    placeholderPhone: 'e.g. 0812345678',
    labelProjectType: 'Project Type',
    selectProjectType: '-- Select project type --',
    labelExisting: 'Do you have an existing website/system?',
    existingYes: 'Yes',
    existingNo: 'No',
    labelBudget: 'Budget Range',
    budgetHint: 'Please select a project type first, then budget options will appear.',
    labelDeadline: 'Desired Timeline',
    selectDeadline: '-- Select timeline --',
    labelRef: 'Reference Website',
    labelRefOptional: '(optional)',
    placeholderRef: 'e.g. https://example.com',
    refHint: 'Share a website you like so our team can better understand your vision.',
    labelRequirements: 'What do you need? Tell us everything!',
    requirementsHint: 'No technical language needed. Just describe it in your own words.',
    placeholderRequirements: 'e.g. I want an e-commerce website with product images, online ordering, card payments, and an order management dashboard.',
    submitBtn: 'Submit Project Request',
    submitting: 'Processing...',
    privacyNote: 'Your information is kept confidential and used for quotation purposes only.',
    successTitle: 'Thank you!',
    successMsg: 'Our team has received your information. We will contact you within',
    successTime: '24 hours',
    cooldownMsg: (s: number) => `You can submit again in ${s} seconds`,
    errorTitle: 'Sorry, submission failed',
    errorMsg: 'This might be due to internet connection or temporary maintenance. Please try again or contact us directly.',
    errName: 'Please enter your name or company name',
    errPhone: 'Please enter your phone number',
    errPhoneFormat: 'Phone number must be 9-10 digits',
    errProjectType: 'Please select a project type',
    errBudget: 'Please select a budget range',
    errDeadline: 'Please select a timeline',
    errRequirements: 'Please tell us what you need',
  },
} as const

// EN labels for dropdown options (values stay Thai for DB)
const PROJECT_TYPE_EN: Record<string, string> = {
  'เว็บไซต์แนะนำตัว / โชว์ผลงาน (แค่แสดงข้อมูล ไม่มีระบบ)': 'Portfolio / Landing Page (display only, no backend)',
  'แอปมือถือ (ใช้งานบนโทรศัพท์ iOS / Android)': 'Mobile App (iOS / Android)',
  'ระบบออนไลน์ / โปรแกรมใช้งานผ่านเน็ต (เช่น ระบบจอง, นัดหมาย, บัญชี)': 'Web Application (e.g. booking, scheduling, accounting)',
  'ร้านค้าออนไลน์ (ขายสินค้า รับชำระเงินในเว็บ)': 'E-commerce (online store with payments)',
  'ระบบจัดการหลังบ้าน (ดูข้อมูล, สต็อก, พนักงาน ฯลฯ)': 'Admin / Back-office System (data, stock, HR, etc.)',
  'ไม่แน่ใจ / อื่นๆ (บอกรายละเอียดด้านล่างได้เลย)': 'Not sure / Other (describe below)',
}

const BUDGET_EN: Record<string, string> = {
  'ต่ำกว่า 3,000 บาท (หน้าเดียว โชว์ข้อมูลพื้นฐาน)': 'Under 3,000 THB (single page, basic info)',
  '3,000 - 8,000 บาท (หลายหน้า มีฟอร์มติดต่อ)': '3,000 - 8,000 THB (multi-page, contact form)',
  '8,000 - 20,000 บาท (ออกแบบสวยงาม ครบถ้วน)': '8,000 - 20,000 THB (beautifully designed, complete)',
  'มากกว่า 20,000 บาท': 'Over 20,000 THB',
  'ต่ำกว่า 30,000 บาท (แอปง่ายๆ ฟีเจอร์เดียว)': 'Under 30,000 THB (simple app, single feature)',
  '30,000 - 80,000 บาท (แอปขนาดเล็ก-กลาง)': '30,000 - 80,000 THB (small-medium app)',
  '80,000 - 200,000 บาท (แอปครบฟีเจอร์ ซับซ้อน)': '80,000 - 200,000 THB (full-featured, complex)',
  'มากกว่า 200,000 บาท': 'Over 200,000 THB',
  'ต่ำกว่า 15,000 บาท (ระบบง่าย ฟีเจอร์เดียว)': 'Under 15,000 THB (simple system, single feature)',
  '15,000 - 50,000 บาท (ระบบขนาดกลาง)': '15,000 - 50,000 THB (medium system)',
  '50,000 - 150,000 บาท (ระบบซับซ้อน หลายฟีเจอร์)': '50,000 - 150,000 THB (complex, multi-feature)',
  'มากกว่า 150,000 บาท': 'Over 150,000 THB',
  'ต่ำกว่า 20,000 บาท (ร้านค้าพื้นฐาน)': 'Under 20,000 THB (basic store)',
  '20,000 - 60,000 บาท (ร้านค้าครบฟีเจอร์)': '20,000 - 60,000 THB (full-featured store)',
  '60,000 - 150,000 บาท (ร้านค้าขนาดใหญ่ หลายระบบ)': '60,000 - 150,000 THB (large store, multi-system)',
  'ต่ำกว่า 15,000 บาท (ระบบง่าย จัดการข้อมูลพื้นฐาน)': 'Under 15,000 THB (simple, basic data management)',
  '50,000 - 150,000 บาท (ระบบซับซ้อน หลายโมดูล)': '50,000 - 150,000 THB (complex, multi-module)',
  'ต่ำกว่า 10,000 บาท': 'Under 10,000 THB',
  '10,000 - 50,000 บาท': '10,000 - 50,000 THB',
  '50,000 - 200,000 บาท': '50,000 - 200,000 THB',
  'ยังไม่มีงบในใจ / อยากให้ประเมินก่อน': 'No budget in mind / Need estimation first',
}

const DEADLINE_EN: Record<string, string> = {
  'ภายใน 1 สัปดาห์ (เร่งด่วนมาก)': 'Within 1 week (very urgent)',
  'ภายใน 2-4 สัปดาห์': 'Within 2-4 weeks',
  'ภายใน 1-3 เดือน': 'Within 1-3 months',
  'มากกว่า 3 เดือน': 'More than 3 months',
  'ยังไม่กำหนด': 'Not decided yet',
}

// ─── Helpers ────────────────────────────────────────────
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

const COOLDOWN_MS = 3 * 60 * 1000
const STORAGE_KEY = 'last_submit_time'

function isValidPhone(value: string) {
  return /^\d{9,10}$/.test(value.replace(/\D/g, ''))
}

function makeValidate(lang: Lang) {
  const s = t[lang]
  return (form: NewClientRequirement): FormErrors => {
    const e: FormErrors = {}
    if (!form.client_name.trim())       e.client_name   = s.errName
    if (!form.contact_info.trim())      e.contact_info  = s.errPhone
    else if (!isValidPhone(form.contact_info)) e.contact_info = s.errPhoneFormat
    if (!form.project_type)             e.project_type  = s.errProjectType
    if (!form.budget)                   e.budget        = s.errBudget
    if (!form.deadline)                 e.deadline      = s.errDeadline
    if (!form.requirements.trim())      e.requirements  = s.errRequirements
    return e
  }
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

function LangToggle({ lang, onChange }: { lang: Lang; onChange: (l: Lang) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(lang === 'th' ? 'en' : 'th')}
      className="fixed top-4 right-4 z-50 px-3 py-1.5 rounded-full border border-gray-700/60 bg-[#12121a] text-sm font-medium text-gray-300 hover:border-gray-500 transition-colors"
    >
      {lang === 'th' ? 'EN' : 'TH'}
    </button>
  )
}

// ─── Component ──────────────────────────────────────────
export default function LeadForm() {
  const [form, setForm]       = useState<NewClientRequirement>(INITIAL_FORM)
  const [errors, setErrors]   = useState<FormErrors>({})
  const [touched, setTouched] = useState<Partial<Record<keyof NewClientRequirement, boolean>>>({})
  const [status, setStatus]   = useState<FormStatus>('idle')
  const [cooldownSec, setCooldownSec] = useState(0)
  const [lang, setLang]       = useState<Lang>('th')

  const s = t[lang]
  const validate = makeValidate(lang)
  const isLoading = status === 'loading'
  const budgetOptions = form.project_type ? (BUDGET_BY_PROJECT_TYPE[form.project_type] ?? []) : []

  const optionLabel = (value: string, map: Record<string, string>) =>
    lang === 'en' ? (map[value] ?? value) : value

  function handleChange(e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value, type } = e.target
    const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
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
    const lastSubmit = Number(localStorage.getItem(STORAGE_KEY) || 0)
    if (Date.now() < lastSubmit) { startCooldown(); return }

    setTouched({ client_name: true, contact_info: true, project_type: true, budget: true, deadline: true, requirements: true })
    const errs = validate(form)
    setErrors(errs)
    if (Object.keys(errs).length > 0) return

    setStatus('loading')
    try {
      await saveClientRequirement(form)
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

  // --- Success page ---
  if (status === 'success' || status === 'cooldown') {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4 relative overflow-hidden">
        <LangToggle lang={lang} onChange={setLang} />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="bg-[#12121a] border border-gray-800/60 rounded-xl p-10 max-w-md w-full text-center relative z-10">
          <TerminalDots />
          <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-5">
            <svg className="w-10 h-10 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">{s.successTitle}</h2>
          <p className="text-gray-400 leading-relaxed mb-6">
            {s.successMsg}{' '}
            <span className="font-semibold text-emerald-400">{s.successTime}</span>
          </p>
          {status === 'cooldown' && cooldownSec > 0 && (
            <p className="text-sm text-gray-500">{s.cooldownMsg(cooldownSec)}</p>
          )}
        </div>
      </div>
    )
  }

  // --- Form page ---
  return (
    <div className="min-h-screen bg-[#0a0a0f] py-10 px-4 relative overflow-hidden">
      <LangToggle lang={lang} onChange={setLang} />

      {/* Background ambient */}
      <div className="absolute top-20 left-1/4 w-2 h-2 bg-emerald-400/30 rounded-full" />
      <div className="absolute top-40 right-1/3 w-1.5 h-1.5 bg-emerald-400/20 rounded-full" />
      <div className="absolute bottom-32 left-1/3 w-1 h-1 bg-gray-500/30 rounded-full" />
      <div className="absolute top-60 right-1/4 w-1.5 h-1.5 bg-gray-500/20 rounded-full" />
      <div className="absolute bottom-60 right-1/5 w-2 h-2 bg-emerald-400/15 rounded-full" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-emerald-500/[0.03] rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-2xl mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <p className="text-sm font-mono text-gray-500 mb-3 tracking-wider">{s.headerComment}</p>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">{s.headerTitle}</h1>
          <p className="text-gray-400">{s.headerSubtitle}</p>
          <div className="mt-4 inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-sm text-emerald-400">{s.statusBadge}</span>
          </div>
        </div>

        {/* Form Card */}
        <form onSubmit={handleSubmit} noValidate
          className="bg-[#12121a] border border-gray-800/60 rounded-xl p-6 md:p-8 space-y-6">

          <TerminalDots />

          {/* Name */}
          <div>
            <SectionLabel>{s.labelName}</SectionLabel>
            <input type="text" name="client_name" value={form.client_name}
              onChange={handleChange} onBlur={handleBlur} disabled={isLoading}
              placeholder={s.placeholderName}
              className={inputClass(!!errors.client_name)} />
            <ErrorMsg msg={errors.client_name} />
          </div>

          {/* Phone */}
          <div>
            <SectionLabel>{s.labelPhone}</SectionLabel>
            <input type="tel" name="contact_info" value={form.contact_info}
              onChange={handleChange} onBlur={handleBlur} disabled={isLoading}
              placeholder={s.placeholderPhone}
              className={inputClass(!!errors.contact_info)} />
            <ErrorMsg msg={errors.contact_info} />
          </div>

          {/* Project Type */}
          <div>
            <SectionLabel>{s.labelProjectType}</SectionLabel>
            <select name="project_type" value={form.project_type}
              onChange={handleChange} onBlur={handleBlur} disabled={isLoading}
              className={inputClass(!!errors.project_type)}>
              <option value="">{s.selectProjectType}</option>
              {PROJECT_TYPES.map(pt => (
                <option key={pt} value={pt}>{optionLabel(pt, PROJECT_TYPE_EN)}</option>
              ))}
            </select>
            <ErrorMsg msg={errors.project_type} />
          </div>

          {/* Existing system */}
          <div>
            <SectionLabel>{s.labelExisting}</SectionLabel>
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
                  {val ? s.existingYes : s.existingNo}
                </label>
              ))}
            </div>
          </div>

          {/* Budget */}
          <div>
            <SectionLabel>{s.labelBudget}</SectionLabel>
            {!form.project_type ? (
              <p className="text-sm text-gray-500 italic py-3 px-4 bg-[#0d1117] rounded-lg border border-dashed border-gray-700/60">
                {s.budgetHint}
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
                    <span className="text-sm text-gray-300 leading-relaxed">{optionLabel(range, BUDGET_EN)}</span>
                  </label>
                ))}
              </div>
            )}
            <ErrorMsg msg={errors.budget} />
          </div>

          {/* Deadline */}
          <div>
            <SectionLabel>{s.labelDeadline}</SectionLabel>
            <select name="deadline" value={form.deadline ?? ''}
              onChange={e => setForm(p => ({ ...p, deadline: e.target.value || null }))}
              onBlur={handleBlur} disabled={isLoading}
              className={inputClass(!!errors.deadline)}>
              <option value="">{s.selectDeadline}</option>
              {DEADLINE_OPTIONS.map(d => (
                <option key={d} value={d}>{optionLabel(d, DEADLINE_EN)}</option>
              ))}
            </select>
            <ErrorMsg msg={errors.deadline} />
          </div>

          {/* Reference URL */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              {s.labelRef} <span className="text-gray-500 font-normal">{s.labelRefOptional}</span>
            </label>
            <input type="url" name="reference_url" value={form.reference_url ?? ''}
              onChange={e => setForm(p => ({ ...p, reference_url: e.target.value || null }))}
              disabled={isLoading}
              placeholder={s.placeholderRef}
              className={inputClass(false)} />
            <p className="mt-1 text-xs text-gray-500">{s.refHint}</p>
          </div>

          {/* Requirements */}
          <div>
            <SectionLabel>{s.labelRequirements}</SectionLabel>
            <p className="text-xs text-gray-500 mb-2">{s.requirementsHint}</p>
            <textarea name="requirements" value={form.requirements}
              onChange={handleChange} onBlur={handleBlur} disabled={isLoading} rows={5}
              placeholder={s.placeholderRequirements}
              className={inputClass(!!errors.requirements) + ' resize-none'} />
            <ErrorMsg msg={errors.requirements} />
          </div>

          {/* Submit Error */}
          {status === 'error' && (
            <div className="bg-orange-500/5 border border-orange-500/20 rounded-lg p-5 space-y-3">
              <div className="flex items-start gap-3">
                <span className="text-2xl shrink-0">:(</span>
                <div>
                  <p className="font-semibold text-gray-200 text-sm">{s.errorTitle}</p>
                  <p className="text-sm text-gray-400 mt-1">{s.errorMsg}</p>
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
                {s.submitting}
              </>
            ) : s.submitBtn}
          </button>

          <p className="text-center text-xs text-gray-600">{s.privacyNote}</p>
        </form>

        <p className="text-center text-xs text-gray-600 mt-6">
          Powered by <span className="text-gray-400 font-medium">FarAways</span><span className="text-emerald-400 font-medium">Tech</span>
        </p>
      </div>
    </div>
  )
}
