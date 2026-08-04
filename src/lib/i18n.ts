// Lightweight i18n with a small dictionary (English + Hindi).
import { createContext, useContext, useMemo } from 'react';

type Lang = 'en' | 'hi';

const dict: Record<string, { en: string; hi: string }> = {
  appName: { en: 'JP Electrical Quotation Studio', hi: 'JP इलेक्ट्रिकल कोटेशन स्टूडियो' },
  dashboard: { en: 'Dashboard', hi: 'डैशबोर्ड' },
  upload: { en: 'Upload PO', hi: 'पीओ अपलोड' },
  quotations: { en: 'Quotations', hi: 'कोटेशन' },
  customers: { en: 'Customers', hi: 'ग्राहक' },
  templates: { en: 'Templates', hi: 'टेम्पलेट' },
  analytics: { en: 'Analytics', hi: 'एनालिटिक्स' },
  settings: { en: 'Settings', hi: 'सेटिंग्स' },
  newQuotation: { en: 'New Quotation', hi: 'नया कोटेशन' },
  save: { en: 'Save', hi: 'सेव करें' },
  export: { en: 'Export', hi: 'निर्यात' },
  search: { en: 'Search', hi: 'खोजें' },
  quoteNo: { en: 'Quotation No.', hi: 'कोटेशन नं.' },
  customer: { en: 'Customer', hi: 'ग्राहक' },
  amount: { en: 'Amount', hi: 'राशि' },
  date: { en: 'Date', hi: 'दिनांक' },
  status: { en: 'Status', hi: 'स्थिति' },
  actions: { en: 'Actions', hi: 'क्रियाएँ' },
  draft: { en: 'Draft', hi: 'ड्राफ्ट' },
  final: { en: 'Final', hi: 'फाइनल' },
  print: { en: 'Print', hi: 'प्रिंट' },
  downloadPdf: { en: 'Download PDF', hi: 'पीडीएफ डाउनलोड' },
  downloadDocx: { en: 'Download Word', hi: 'वर्ड डाउनलोड' },
  cancel: { en: 'Cancel', hi: 'रद्द करें' },
  delete: { en: 'Delete', hi: 'हटाएँ' },
  duplicate: { en: 'Duplicate', hi: 'डुप्लिकेट' },
  edit: { en: 'Edit', hi: 'संपादित' },
  noData: { en: 'No data yet', hi: 'अभी कोई डेटा नहीं' },
};

export type { Lang };

export const LangContext = createContext<Lang>('en');

export function useLang(): Lang {
  return useContext(LangContext);
}

export function t(key: keyof typeof dict, lang: Lang): string {
  return dict[key]?.[lang] ?? dict[key]?.en ?? key;
}

export function useT() {
  const lang = useLang();
  return useMemo(() => (key: keyof typeof dict) => t(key, lang), [lang]);
}
