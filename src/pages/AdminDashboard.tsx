import { useEffect, useState, useMemo, type FormEvent } from 'react'
import { fetchAllLeads, updateLeadStatus, adminSignIn, adminSignOut, onAuthChange } from '../lib/supabase'
import {
  type ClientRequirement, type LeadStatus,
  STATUS_LABELS, STATUS_COLORS, PROJECT_TYPES,
} from '../types'

// ── Analytics Card ──────────────────────────────────────────────
function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-5 border border-gray-100">
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
    </div>
  )
}

// ── Status Badge ─────────────────────────────────────────────────
function StatusBadge({ status }: { status: LeadStatus }) {
  return (
    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  )
}

// ── Lead Detail Modal ────────────────────────────────────────────
function LeadModal({
  lead, onClose, onStatusChange,
}: {
  lead: ClientRequirement
  onClose: () => void
  onStatusChange: (id: string, s: LeadStatus) => Promise<void>
}) {
  const [updating, setUpdating] = useState(false)
  const statuses: LeadStatus[] = ['new', 'contacted', 'in_progress', 'closed_won', 'closed_lost']

  async function handleStatus(s: LeadStatus) {
    setUpdating(true)
    await onStatusChange(lead.id, s)
    setUpdating(false)
    onClose()
  }

  const date = new Date(lead.created_at).toLocaleString('th-TH', {
    timeZone: 'Asia/Bangkok', dateStyle: 'medium', timeStyle: 'short',
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-gray-100 flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-800">{lead.client_name}</h2>
            <p className="text-sm text-gray-500 mt-0.5">{date}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>

        <div className="p-6 space-y-4 text-sm">
          {/* Info Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-400 mb-0.5">เบอร์โทร</p>
              <p className="font-medium text-gray-800">{lead.contact_info}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-400 mb-0.5">ประเภทงาน</p>
              <p className="font-medium text-gray-800">{lead.project_type}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-400 mb-0.5">กำหนดส่ง</p>
              <p className="font-medium text-gray-800">{lead.deadline ?? 'ไม่ได้ระบุ'}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-400 mb-0.5">ระบบเก่า</p>
              <p className="font-medium text-gray-800">{lead.has_existing_system ? 'มีอยู่แล้ว' : 'ยังไม่มี'}</p>
            </div>
          </div>

          {/* Budget */}
          <div className="bg-indigo-50 rounded-xl p-3">
            <p className="text-xs text-indigo-400 mb-0.5">งบประมาณ</p>
            <p className="font-medium text-indigo-800">{lead.budget}</p>
          </div>

          {/* Requirements */}
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-xs text-gray-400 mb-1">รายละเอียด</p>
            <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{lead.requirements}</p>
          </div>

          {/* Reference URL */}
          {lead.reference_url && (
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-400 mb-1">เว็บอ้างอิง</p>
              <a href={lead.reference_url} target="_blank" rel="noopener noreferrer"
                className="text-indigo-600 underline break-all hover:text-indigo-800">
                {lead.reference_url}
              </a>
            </div>
          )}

          {/* Status Change */}
          <div>
            <p className="text-xs text-gray-400 mb-2 font-medium">เปลี่ยน Status</p>
            <div className="flex flex-wrap gap-2">
              {statuses.map(s => (
                <button key={s} disabled={updating || lead.status === s}
                  onClick={() => handleStatus(s)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition border-2 ${
                    lead.status === s
                      ? STATUS_COLORS[s] + ' border-current opacity-100 cursor-default'
                      : 'border-gray-200 text-gray-500 hover:border-indigo-400 hover:text-indigo-600'
                  } disabled:opacity-50`}>
                  {STATUS_LABELS[s]}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Login Screen ─────────────────────────────────────────────────
function LoginScreen() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  async function handleLogin(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await adminSignIn(email, password)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-800">Admin Login</h1>
          <p className="text-sm text-gray-400 mt-1">เข้าสู่ระบบเพื่อดู Dashboard</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">อีเมล</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              required placeholder="admin@example.com" disabled={loading}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">รหัสผ่าน</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              required placeholder="••••••••" disabled={loading}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent" />
          </div>

          {error && (
            <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">{error}</p>
          )}

          <button type="submit" disabled={loading}
            className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 transition disabled:opacity-60 flex items-center justify-center gap-2">
            {loading ? (
              <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>กำลังเข้าสู่ระบบ...</>
            ) : 'เข้าสู่ระบบ'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ── Main Admin Dashboard ─────────────────────────────────────────
export default function AdminDashboard() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null) // null = กำลังเช็ค
  const [leads, setLeads]           = useState<ClientRequirement[]>([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState('')
  const [selected, setSelected]     = useState<ClientRequirement | null>(null)
  const [search, setSearch]         = useState('')
  const [filterStatus, setFilterStatus] = useState<LeadStatus | ''>('')
  const [filterBudget, setFilterBudget] = useState('')
  const [filterType, setFilterType]   = useState('')

  // เช็คสถานะ login ตอนเปิดหน้า
  useEffect(() => {
    const { data: { subscription } } = onAuthChange(setIsLoggedIn)
    return () => subscription.unsubscribe()
  }, [])

  // โหลด leads เมื่อ login แล้ว
  useEffect(() => {
    if (isLoggedIn) loadLeads()
  }, [isLoggedIn])

  async function loadLeads() {
    setLoading(true)
    setError('')
    try {
      const data = await fetchAllLeads()
      setLeads(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'โหลดข้อมูลไม่สำเร็จ')
    }
    setLoading(false)
  }

  async function handleStatusChange(id: string, status: LeadStatus) {
    await updateLeadStatus(id, status)
    setLeads(prev => prev.map(l => l.id === id ? { ...l, status } : l))
    if (selected?.id === id) setSelected(prev => prev ? { ...prev, status } : null)
  }

  // Analytics
  const stats = useMemo(() => {
    const today = new Date().toDateString()
    return {
      total:       leads.length,
      today:       leads.filter(l => new Date(l.created_at).toDateString() === today).length,
      new:         leads.filter(l => l.status === 'new').length,
      contacted:   leads.filter(l => l.status === 'contacted').length,
      in_progress: leads.filter(l => l.status === 'in_progress').length,
      closed_won:  leads.filter(l => l.status === 'closed_won').length,
      closed_lost: leads.filter(l => l.status === 'closed_lost').length,
    }
  }, [leads])

  // Filter
  const filtered = useMemo(() => leads.filter(l => {
    const q = search.toLowerCase()
    const matchSearch = !q || l.client_name.toLowerCase().includes(q) || l.contact_info.includes(q)
    const matchStatus = !filterStatus || l.status === filterStatus
    const matchBudget = !filterBudget || l.budget === filterBudget
    const matchType   = !filterType   || l.project_type === filterType
    return matchSearch && matchStatus && matchBudget && matchType
  }), [leads, search, filterStatus, filterBudget, filterType])

  const statuses: LeadStatus[] = ['new', 'contacted', 'in_progress', 'closed_won', 'closed_lost']

  // กำลังเช็คสถานะ login
  if (isLoggedIn === null) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400">กำลังโหลด...</div>
  }

  // ยังไม่ได้ login
  if (!isLoggedIn) return <LoginScreen />

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <div>
            <h1 className="font-bold text-gray-800 leading-tight">Admin Dashboard</h1>
            <p className="text-xs text-gray-400">Lead Tracker Platform</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <a href="/" className="text-sm text-gray-500 hover:text-indigo-600 transition">← ดูหน้าฟอร์ม</a>
          <button onClick={adminSignOut}
            className="text-sm text-gray-500 hover:text-red-500 transition border border-gray-200 px-3 py-2 rounded-lg hover:border-red-300">
            ออกจากระบบ
          </button>
          <button onClick={loadLeads} disabled={loading}
            className="flex items-center gap-1.5 bg-indigo-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-indigo-700 transition disabled:opacity-50">
            <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            รีเฟรช
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* Analytics Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          <StatCard label="ทั้งหมด"          value={stats.total}       color="text-gray-800" />
          <StatCard label="วันนี้"            value={stats.today}       color="text-indigo-600" />
          <StatCard label="ใหม่"             value={stats.new}         color="text-gray-600" />
          <StatCard label="ติดต่อแล้ว"       value={stats.contacted}   color="text-blue-600" />
          <StatCard label="กำลังดำเนินการ"   value={stats.in_progress} color="text-yellow-600" />
          <StatCard label="ปิดงานสำเร็จ"     value={stats.closed_won}  color="text-green-600" />
          <StatCard label="ไม่ได้งาน"        value={stats.closed_lost} color="text-red-600" />
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <input
              type="text" placeholder="🔍 ค้นหาชื่อ หรือเบอร์โทร..."
              value={search} onChange={e => setSearch(e.target.value)}
              className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 sm:col-span-2"
            />
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as LeadStatus | '')}
              className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400">
              <option value="">ทุก Status</option>
              {statuses.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
            </select>
            <select value={filterType} onChange={e => setFilterType(e.target.value)}
              className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400">
              <option value="">ทุกประเภทงาน</option>
              {PROJECT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="text-xs text-gray-400 self-center">กรองงบ:</span>
            <button onClick={() => setFilterBudget('')}
              className={`px-3 py-1 rounded-full text-xs border transition ${!filterBudget ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-200 text-gray-500 hover:border-indigo-400'}`}>
              ทั้งหมด
            </button>
            {[...new Set(leads.map(l => l.budget))].filter(Boolean).map((b: string) => (
              <button key={b} onClick={() => setFilterBudget(b)}
                className={`px-3 py-1 rounded-full text-xs border transition ${filterBudget === b ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-200 text-gray-500 hover:border-indigo-400'}`}>
                {b.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-700">
              รายการ Lead{' '}
              <span className="text-sm font-normal text-gray-400">({filtered.length} รายการ)</span>
            </h2>
          </div>

          {error && (
            <div className="p-6 text-center text-red-500 text-sm">{error}</div>
          )}

          {loading && !error && (
            <div className="p-12 text-center text-gray-400">
              <svg className="w-8 h-8 animate-spin mx-auto mb-2 text-indigo-400" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              กำลังโหลด...
            </div>
          )}

          {!loading && !error && filtered.length === 0 && (
            <div className="p-12 text-center text-gray-400 text-sm">ไม่พบข้อมูลที่ตรงกับเงื่อนไข</div>
          )}

          {!loading && !error && filtered.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {['ชื่อ', 'เบอร์', 'ประเภท', 'งบประมาณ', 'กำหนดส่ง', 'Status', 'วันที่'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map(lead => {
                    const date = new Date(lead.created_at).toLocaleDateString('th-TH', {
                      timeZone: 'Asia/Bangkok', day: 'numeric', month: 'short',
                    })
                    return (
                      <tr key={lead.id} onClick={() => setSelected(lead)}
                        className="hover:bg-indigo-50 cursor-pointer transition-colors">
                        <td className="px-4 py-3 font-medium text-gray-800 whitespace-nowrap">{lead.client_name}</td>
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{lead.contact_info}</td>
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{lead.project_type}</td>
                        <td className="px-4 py-3 text-gray-600 text-xs max-w-[160px] truncate">{lead.budget.split(' ')[0]}{' '}บาท</td>
                        <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">
                          {lead.deadline?.split(' ')[0] ?? '—'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <StatusBadge status={lead.status} />
                        </td>
                        <td className="px-4 py-3 text-gray-400 whitespace-nowrap text-xs">{date}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {selected && (
        <LeadModal lead={selected} onClose={() => setSelected(null)} onStatusChange={handleStatusChange} />
      )}
    </div>
  )
}
