# Smart Requirement — Lead Tracker Platform

> ระบบรับและจัดการ Lead ลูกค้าสำหรับ Software House
> สร้างด้วย React + Supabase + Vercel · ฟรี 100% · Deploy แล้ว

**Live Demo →** https://smart-requirement.vercel.app
**Admin Dashboard →** https://smart-requirement.vercel.app/admin

---

## ภาพรวมของระบบ

ระบบนี้ออกแบบมาเพื่อแก้ปัญหาจริงของ Software House ที่รับงาน:
ลูกค้าสอบถามเข้ามาจากหลายช่องทาง ยากต่อการติดตาม และทีมไม่รู้ว่าใครรับเรื่องแล้วหรือยัง

**Smart Requirement** รวมทุกอย่างไว้ในที่เดียว — ลูกค้ากรอกฟอร์ม → ทีมได้รับแจ้ง Telegram ทันที → จัดการ Lead ผ่าน Dashboard

---

## Features

### หน้าลูกค้า (Customer Form)
- ฟอร์มรับ requirement ครบถ้วน (ชื่อ, เบอร์, ประเภทงาน, งบ, deadline, รายละเอียด)
- **Budget ปรับตามประเภทงาน** — ลูกค้าเห็นตัวเลขที่เหมาะสมกับงานจริงๆ
- Validation แบบ real-time พร้อม error message ภาษาชาวบ้าน
- Anti-spam cooldown 3 นาที (ป้องกัน submit ซ้ำ)
- Prevent double submit ระหว่าง loading
- Success page พร้อม animation เมื่อส่งสำเร็จ

### Admin Dashboard
- Login ด้วย Supabase Authentication (email/password)
- Analytics cards: ทั้งหมด, วันนี้, แต่ละ status
- ค้นหาด้วยชื่อหรือเบอร์โทร
- Filter ตาม Status / ประเภทงาน / งบประมาณ
- Lead detail modal พร้อมข้อมูลครบถ้วน
- เปลี่ยน status กดปุ๊บปิด modal อัตโนมัติ
- Status tracking: ใหม่ → ติดต่อแล้ว → กำลังดำเนินการ → ปิดงานสำเร็จ / ไม่ได้งาน

### Notification System
- **Telegram แจ้งเตือนทันทีเมื่อมี Lead ใหม่** ผ่าน Database Trigger (pg_net)
- ข้อมูลครบ: ชื่อ, เบอร์, ประเภทงาน, งบ, deadline, รายละเอียด
- Error notification แยก chat เมื่อระบบมีปัญหา
- Token ปลอดภัย 100% — ซ่อนอยู่ใน Vercel server ไม่มีทาง leak

---

## Tech Stack

| Layer | Technology | หน้าที่ |
|---|---|---|
| Frontend | React 18 + TypeScript | UI ทั้งหมด |
| Styling | Tailwind CSS | Design system |
| Build Tool | Vite | Fast build & HMR |
| Database | Supabase (PostgreSQL) | เก็บ Lead data |
| Auth | Supabase Auth | Admin login |
| Notification | Telegram Bot API | แจ้งเตือน real-time |
| Hosting | Vercel | Deploy frontend + API |
| Serverless | Vercel API Routes | ซ่อน Telegram token |

---

## Architecture

```
ลูกค้ากรอกฟอร์ม
      │
      ▼
  React Form ──── validate ──── Supabase INSERT
                                      │
                          ┌───────────┴───────────┐
                          ▼                       ▼
                    DB Trigger              RLS Policy
                   (pg_net)                (anon: INSERT only)
                          │
                          ▼
                  POST /api/notify
                  (Vercel Serverless)
                          │
                          ▼
                   Telegram Bot 🔔

Admin Dashboard
      │
      ▼
  Supabase Auth ──── login ──── fetch leads
  (authenticated)              (RLS: authenticated SELECT/UPDATE)
```

---

## Security

- **RLS (Row Level Security)** — ลูกค้า INSERT ได้อย่างเดียว, Admin ที่ login แล้วถึงจะ SELECT/UPDATE ได้
- **Telegram Token** — ไม่มีใน frontend code เลย อยู่ใน Vercel Environment Variables เท่านั้น
- **No VITE_ prefix** สำหรับ secret keys — ไม่มีทาง expose ออก browser
- **Anti-spam** — LocalStorage cooldown ป้องกัน flood

---

## Project Structure

```
smartRequirement/
├── api/
│   └── notify.ts              # Vercel Serverless — ส่ง Telegram
├── src/
│   ├── components/
│   │   └── LeadForm.tsx       # หน้าฟอร์มลูกค้า
│   ├── pages/
│   │   └── AdminDashboard.tsx # Admin Dashboard
│   ├── lib/
│   │   ├── supabase.ts        # DB client + Auth functions
│   │   └── telegram.ts        # Telegram notification helpers
│   └── types/
│       └── index.ts           # Types, constants, options
├── supabase_setup.sql          # สร้างตาราง + RLS policies
├── supabase_admin_migration.sql# เพิ่ม columns + policies
├── supabase_telegram_trigger.sql# DB Trigger ส่ง Telegram
└── vercel.json                 # SPA routing config
```

---

## Environment Variables

### Vercel (Server-side — ไม่มี VITE_)
```
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
TELEGRAM_ERROR_CHAT_ID=
```

### Frontend (มี VITE_)
```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

---

## Getting Started

```bash
# Clone
git clone https://github.com/Ibrahimdata1/userReq.git
cd userReq

# Install
npm install

# ตั้งค่า env
cp .env.example .env
# แก้ไข .env ใส่ค่าจริง

# Run development
npm run dev

# Build
npm run build
```

---

## Database Setup

รัน SQL ตามลำดับใน Supabase SQL Editor:

```
1. supabase_setup.sql           — สร้างตาราง
2. supabase_admin_migration.sql — เพิ่ม columns และ policies
3. supabase_telegram_trigger.sql— ตั้ง DB Trigger แจ้ง Telegram
```

---

## Roadmap

- [x] Customer form + validation
- [x] Admin Dashboard + auth
- [x] Telegram real-time notification
- [x] Lead status tracking
- [x] Dynamic budget by project type
- [ ] Export CSV
- [ ] Email auto-reply (Resend.com)
- [ ] File upload (Supabase Storage)
- [ ] Line Notify integration

---

## Live URLs

| URL | คำอธิบาย |
|-----|----------|
| https://smart-requirement.vercel.app | หน้าลูกค้ากรอกฟอร์ม |
| https://smart-requirement.vercel.app/admin | Admin Dashboard |
| https://github.com/Ibrahimdata1/userReq | Source Code |
