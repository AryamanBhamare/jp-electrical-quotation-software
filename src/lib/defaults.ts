import type { AppSettings, CompanyDetails, CustomerDetails, QuoteTemplate } from '@shared/types';
import { DEFAULT_SETTINGS } from '@shared/types';
import { uid } from './id';

export function defaultCompany(): CompanyDetails {
  return {
    name: 'JEEVAN PRAKASH ELECTRICALS & ENTERPRISES',
    titlePrefix: 'M/S.',
    businessDesc: 'GOVT. ELECTRICAL CONTRACTOR',
    contactPerson: 'SACHIN',
    address: 'AMBAD, NASHIK - 10',
    gstin: '',
    pan: '',
    email: 'jpelectricals53@gmail.com',
    phone: '9405307668',
    website: '',
    logo: null,
    stamp: null,
    bank: {
      name: '',
      branch: '',
      accountName: '',
      accountNumber: '',
      ifsc: '',
      upi: 'jpelectricals@upi',
      qr: null,
    },
    signatory: { name: 'Sachin', role: 'Authorized Signatory', image: null },
  };
}

export function defaultSettings(): AppSettings {
  const year = String(new Date().getFullYear());
  return { ...DEFAULT_SETTINGS, quoteYear: year };
}

export function defaultCustomer(): CustomerDetails {
  return {
    id: uid('cust'),
    name: '',
    company: '',
    attention: '',
    gstin: '',
    pan: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    phone: '',
    email: '',
    createdAt: new Date().toISOString(),
  };
}

export function defaultTemplates(): QuoteTemplate[] {
  return [
    {
      id: 'default',
      name: 'Classic Industrial',
      isDefault: true,
      isSystem: true,
      accent: '#0f172a',
      font: 'sans',
      headerAlign: 'left',
      showHeaderBorder: true,
      showFooterLine: true,
      logoSize: 90,
      signatureSize: 120,
      stampSize: 110,
      watermarkOpacity: 0.06,
      pageMargin: 28,
      bodyFontSize: 13,
      tableHeaderBg: '#f1f5f9',
    },
    {
      id: 'minimal',
      name: 'Minimal',
      isDefault: false,
      isSystem: true,
      accent: '#0f172a',
      font: 'sans',
      headerAlign: 'left',
      showHeaderBorder: false,
      showFooterLine: false,
      logoSize: 80,
      signatureSize: 120,
      stampSize: 110,
      watermarkOpacity: 0.05,
      pageMargin: 32,
      bodyFontSize: 13,
      tableHeaderBg: '#f1f5f9',
    },
    {
      id: 'classic',
      name: 'Classic Serif',
      isDefault: false,
      isSystem: true,
      accent: '#7c3aed',
      font: 'serif',
      headerAlign: 'center',
      showHeaderBorder: true,
      showFooterLine: true,
      logoSize: 90,
      signatureSize: 120,
      stampSize: 110,
      watermarkOpacity: 0.05,
      pageMargin: 28,
      bodyFontSize: 13,
      tableHeaderBg: '#f3e8ff',
    },
    {
      id: 'modern',
      name: 'Modern Dark',
      isDefault: false,
      isSystem: true,
      accent: '#059669',
      font: 'sans',
      headerAlign: 'left',
      showHeaderBorder: true,
      showFooterLine: true,
      logoSize: 90,
      signatureSize: 120,
      stampSize: 110,
      watermarkOpacity: 0.07,
      pageMargin: 28,
      bodyFontSize: 13,
      tableHeaderBg: '#d1fae5',
    },
  ];
}
