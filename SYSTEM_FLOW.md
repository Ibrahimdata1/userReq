# Smart Requirement — System Flow & Architecture

---

## ภาพรวมระบบ

```
┌─────────────────────────────────────────────────────────────────┐
│                        SMART REQUIREMENT                        │
│              Lead Management System for Software House          │
└─────────────────────────────────────────────────────────────────┘

          ลูกค้า                              ทีมงาน
            │                                   │
            ▼                                   ▼
    ┌───────────────┐                  ┌────────────────┐
    │  หน้าฟอร์ม    │                  │ Admin Dashboard│
    │  (Browser)   │                  │   (Browser)    │
    └───────┬───────┘                  └───────┬────────┘
            │                                  │
            ▼                                  ▼
    ┌───────────────────────────────────────────────────┐
    │                   SUPABASE                        │
    │  ┌─────────────────┐    ┌───────────────────┐    │
    │  │client_requirements│  │    error_logs     │    │
    │  │   (Lead data)   │    │  (Error records)  │    │
    │  └────────┬────────┘    └────────┬──────────┘    │
    │           │                      │                │
    │    DB Trigger               DB Trigger            │
    │           │                      │                │
    │  ┌────────▼──────────────────────▼──────────┐    │
    │  │              Supabase Vault               │    │
    │  │         (TELEGRAM_BOT_TOKEN เข้ารหัส)    │    │
    │  └────────────────────┬─────────────────────┘    │
    └───────────────────────┼──────────────────────────┘
                            │ pg_net (HTTP)
                            ▼
                   ┌────────────────┐
                   │  Telegram API  │
                   └───────┬────────┘
                           │
                           ▼
                   ┌────────────────┐
                   │ ทีมงานได้รับ   │
                   │  แจ้งเตือน 🔔  │
                   └────────────────┘
```

---

## Flow ที่ 1 — ลูกค้ากรอกฟอร์ม (กรณีปกติ)

```
Step 1: ลูกค้าเข้าหน้าเว็บ
        smart-requirement.vercel.app
              │
              ▼
Step 2: กรอกข้อมูล
        ├── ชื่อ-นามสกุล / บริษัท
        ├── เบอร์โทรศัพท์
        ├── ประเภทงาน (6 ตัวเลือก)
        ├── งบประมาณ (เปลี่ยนตามประเภทงาน)
        ├── กำหนดเวลา
        └── รายละเอียดที่ต้องการ
              │
              ▼
Step 3: กด "ส่งข้อมูลขอใบเสนอราคา"
        [Validate ข้อมูลฝั่ง Browser ก่อน]
              │
              ├── ❌ ข้อมูลไม่ครบ → แสดง error ทันที (ไม่ส่งข้อมูล)
              │
              ▼ ✅ ข้อมูลครบ
Step 4: INSERT ลง Supabase (client_requirements)
              │
              ├── ❌ บันทึกไม่สำเร็จ → ไป Flow ที่ 2
              │
              ▼ ✅ บันทึกสำเร็จ
Step 5: DB Trigger ทำงานอัตโนมัติบน Supabase Server
        [ดึง Token จาก Vault → ยิง HTTP ไป Telegram]
              │
Step 6: ┌────┴──────────────────┐
        ▼                       ▼
   ลูกค้าเห็น              ทีมงานได้รับ
   "ขอบคุณ! 🎉"          Telegram แจ้งเตือน 🔔
   (หน้า success)         พร้อมข้อมูลครบ
```

---

## Flow ที่ 2 — เมื่อเกิด Error

```
Step 1-3: เหมือน Flow ปกติ
              │
              ▼
Step 4: INSERT ล้มเหลว (เน็ตหลุด / Supabase ล่ม)
              │
              ▼
Step 5: INSERT ลง error_logs แทน
        [ชื่อ + เบอร์ + ข้อความ error]
              │
              ▼
Step 6: DB Trigger ทำงาน → Vault → Telegram
        ├── ทีมงานได้รับแจ้ง 🚨 "ERROR เกิดขึ้น"
        └── ลูกค้าเห็น error พร้อมปุ่ม Facebook/LINE
```

---

## Flow ที่ 3 — Admin จัดการ Lead

```
Step 1: เข้า Admin Dashboard
        smart-requirement.vercel.app/admin
              │
              ▼
Step 2: Login (Email + Password)
        [Supabase Authentication]
              │
              ▼
Step 3: ดู Analytics Dashboard
        ┌────────┬────────┬───────────┬──────────┬──────────┐
        │ทั้งหมด │ วันนี้ │   ใหม่    │ติดต่อแล้ว│กำลังทำงาน│
        └────────┴────────┴───────────┴──────────┴──────────┘
              │
              ▼
Step 4: ค้นหา / กรองข้อมูล Lead
        ├── ค้นด้วยชื่อหรือเบอร์โทร
        ├── กรองตาม Status
        └── กรองตามประเภทงาน
              │
              ▼
Step 5: คลิก Lead → ดูรายละเอียดครบ
              │
              ▼
Step 6: เปลี่ยน Status → ปิด Modal อัตโนมัติ

        ใหม่ → ติดต่อแล้ว → กำลังดำเนินการ → ปิดงานสำเร็จ
                                             → ไม่ได้งาน
```

---

## Security Architecture

```
❌ วิธีที่ไม่ปลอดภัย (ไม่ใช้):
   Browser → Token โผล่ใน JavaScript → Telegram
   (ใครก็ดู Source Code เห็น Token)

✅ วิธีที่ใช้จริง:
   Browser → Supabase → DB Trigger → Vault (Encrypted) → Telegram
   (Token ไม่เคยโผล่ใน Code หรือ Browser เลย)
```

| Layer | ข้อมูลที่ปลอดภัย |
|---|---|
| Browser (ลูกค้า) | เห็นแค่ฟอร์ม ไม่เห็น Token |
| Supabase RLS | ลูกค้า INSERT ได้อย่างเดียว |
| Supabase Vault | Token เข้ารหัส ดึงได้แค่ใน Trigger |
| Admin Dashboard | ต้อง Login ก่อนถึงดูข้อมูลได้ |

---

## ข้อดี ✅

| ข้อดี | รายละเอียด |
|---|---|
| **ฟรี 100%** | Vercel + Supabase + Telegram Free Tier |
| **Real-time** | Telegram เด้งทันทีที่มี Lead ใหม่ |
| **ไม่ขึ้นกับ Browser** | Trigger ทำงานบน Server แม้ปิด Tab แล้ว |
| **ปลอดภัย** | Token เข้ารหัสใน Vault ไม่มีทาง Leak |
| **ใช้งานง่าย** | ลูกค้าไม่ต้องรู้ภาษาเทคนิค |
| **ติดตามได้** | เห็น Lead ทุกขั้นตอนใน Dashboard |
| **ไม่มี Lead หาย** | ทุก Lead บันทึกลง DB มีหลักฐานตลอด |

---

## ข้อเสีย / ข้อจำกัด ⚠️

| ข้อจำกัด | รายละเอียด | แนวทางแก้ |
|---|---|---|
| **Free Tier มีขีดจำกัด** | Supabase DB 500MB, 50k user/เดือน | Upgrade เมื่อธุรกิจโต |
| **ไม่มี Email แจ้งลูกค้า** | ลูกค้าไม่ได้รับ email ยืนยัน | เพิ่ม Resend.com |
| **ไม่มี File Upload** | แนบไฟล์ design/ตัวอย่างไม่ได้ | เพิ่ม Supabase Storage |
| **ไม่มี Export** | ดึงข้อมูลออก Excel ไม่ได้ | เพิ่ม Export CSV |
| **Admin คนเดียว** | ยังไม่มีระบบ role ทีม | เพิ่ม Multi-user |
| **Telegram เท่านั้น** | แจ้งเตือนผ่านช่องทางเดียว | เพิ่ม LINE / Email |

---

## Tech Stack Summary

```
┌─────────────────────────────────────────┐
│  Frontend  │ React 18 + TypeScript      │
│            │ Tailwind CSS + Vite        │
├─────────────────────────────────────────┤
│  Database  │ Supabase (PostgreSQL)      │
│  Auth      │ Supabase Authentication   │
│  Security  │ Supabase Vault + RLS      │
├─────────────────────────────────────────┤
│  Notify    │ Telegram Bot + pg_net      │
│  Hosting   │ Vercel                     │
└─────────────────────────────────────────┘

ค่าใช้จ่าย: ฟรี 100%
```

---

## Live Demo

| | URL |
|---|---|
| หน้าลูกค้า | https://smart-requirement.vercel.app |
| Admin | https://smart-requirement.vercel.app/admin |
| Source Code | https://github.com/Ibrahimdata1/userReq |
