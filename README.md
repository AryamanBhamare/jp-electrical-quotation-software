# JPE Electrical Quotation Studio

Convert **Purchase Order PDFs** into **editable, professional quotations** — auto-extract every field, fine-tune in a live A4 editor, and export to **PDF**, **Word**, **Excel**, **HTML** or **CSV**.

Fully client-side (your documents never leave the browser) and deployable free on **Vercel**.

## Features

- 📄 **Upload any PO PDF** — text layer extracted with pdf.js; scanned files auto-fallback to **Tesseract.js OCR**.
- 🧠 **Smart auto-extraction** — PO number/date, buyer name, GSTIN, address, phone, email, currency and a line-item table are heuristically mapped into the quotation.
- ✏️ **Live A4 editor** — two-column workspace with an instant preview; add/remove/reorder items, HSN, drawing/rev details, GST (CGST/SGST/IGST), discounts, amount-in-words, bank details and a payment QR.
- 📤 **Exports** — PDF (jsPDF + autotable), Word (docx with header/footer & page numbers), Excel, HTML, CSV, and a shareable link/WhatsApp/Email message.
- 💾 **Local-first storage** — everything persisted in `localStorage` (Zustand), with backup/restore JSON, undo/redo, auto-save and an audit log.
- 📊 **Analytics** — created/exported activity chart plus full audit trail.
- 🎨 **Themes & templates** — dark/light/system, custom accent, 4 built-in quotation templates with a mini-preview editor.
- 🌐 **i18n** — English & हिन्दी, Indian number formatting and currency symbol auto-detection.
- 📱 **PWA** — installable, offline-capable.

## Stack

- **Frontend:** React 19, TypeScript, Vite, TailwindCSS, shadcn-style Radix UI, Framer Motion, React Hook Form + Zod, Zustand
- **Parsing:** pdfjs-dist, tesseract.js
- **Export:** jsPDF + jspdf-autotable, docx, SheetJS (xlsx), html2canvas
- **Backend (optional):** Express + pdf-parse fallback for local dev / Vercel serverless

## Getting started

```bash
npm install
npm run dev        # web (:5173) + optional API (:5000) together
# or
npm run dev:web    # frontend only
npm run dev:server # API only
```

Open http://localhost:5173.

## Building & type-checking

```bash
npm run check   # tsc --noEmit
npm run build   # type-check + production build → dist/
npm run preview # preview the production build
npm run icons   # regenerate PWA icons (PowerShell)
```

## Deploying to Vercel (free)

1. Push the repo to GitHub.
2. On Vercel: **New Project → Import** — the framework is auto-detected as Vite.
3. Leave build command as `npm run build` and output dir as `dist` (already set in `vercel.json`).
4. Deploy. Done — `/api/health` confirms the optional serverless function.

No database, no server costs: quotations live in the browser; export the JSON backup from **Settings → Data** to move devices.

## Project layout

```
├─ shared/        # shared domain types + defaults (frontend & backend)
├─ src/
│  ├─ services/   # pdf parser, OCR, extractor, builder, exporters (docx/pdf/excel/html)
│  ├─ store/      # Zustand store (persist, undo/redo, audit, analytics)
│  ├─ lib/        # calculations, format, i18n, codec (share links), csv, image utils
│  ├─ components/ # ui primitives, quote renderer (A4), editor widgets
│  ├─ pages/      # Dashboard, Upload, Editor, Quotations, Customers, Templates, Analytics, Settings, Share
│  └─ App.tsx     # routes (hash router) + providers
├─ server/        # optional Express API (dev)
├─ api/           # Vercel serverless function
└─ public/        # favicon, manifest, PWA icons
```

## Notes

- **First OCR use** downloads the Tesseract worker (~a few MB) from jsDelivr once, then it's cached by the service worker.
- **Scanned/photo PDFs** may extract imperfectly — the review screen shows a confidence score and lets you force OCR or correct fields before building the quotation.
- Sample PO output matching is a deliberate work-in-progress: the standard professional layout is refined per real samples.
