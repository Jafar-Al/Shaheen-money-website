/**
 * Third-party figures used to frame the problem (audit P-04). Each was
 * checked against the primary source on 23 September 2026. When a source
 * publishes newer data, update value, period and asOf together.
 */
import type { Localized, Sourced } from './types';

export interface ProblemStat extends Sourced<number> {
  id: string;
  display: string;
  label: Localized;
}

export const problemStats: ProblemStat[] = [
  {
    id: 'global-cost',
    value: 6.36,
    display: '6.36%',
    label: {
      en: 'average cost of sending money across borders',
      ar: 'متوسط كلفة إرسال الأموال عبر الحدود',
    },
    source: {
      name: { en: 'World Bank, Remittance Prices Worldwide', ar: 'البنك الدولي، مؤشر أسعار التحويلات حول العالم' },
      url: 'https://remittanceprices.worldbank.org/',
      asOf: '2025-09',
      period: { en: 'Q3 2025', ar: 'الربع الثالث 2025' },
      note: {
        en: 'Global average total cost of sending the equivalent of US$200.',
        ar: 'المتوسط العالمي للكلفة الإجمالية لإرسال ما يعادل 200 دولار أمريكي.',
      },
    },
  },
  {
    id: 'sdg-target',
    value: 3,
    display: '3%',
    label: {
      en: 'the UN’s 2030 target for that cost. Today’s average is more than double.',
      ar: 'هدف الأمم المتحدة لهذه الكلفة بحلول 2030، والمتوسط اليوم أكثر من ضعفه',
    },
    source: {
      name: { en: 'United Nations, Sustainable Development Goal target 10.c', ar: 'الأمم المتحدة، الغاية 10.ج من أهداف التنمية المستدامة' },
      url: 'https://sdgs.un.org/goals/goal10',
      asOf: '2015-09',
      period: { en: 'adopted 2015, for 2030', ar: 'اعتُمد عام 2015، لعام 2030' },
    },
  },
  {
    id: 'lebanon-no-account',
    value: 77,
    display: '77%',
    label: {
      en: 'of adults in Lebanon have no account at a bank or mobile-money provider',
      ar: 'من البالغين في لبنان لا يملكون حساباً في بنك أو لدى مزوّد محفظة إلكترونية',
    },
    source: {
      name: { en: 'World Bank, Global Findex 2025', ar: 'البنك الدولي، قاعدة بيانات Global Findex لعام 2025' },
      url: 'https://www.worldbank.org/en/publication/globalfindex',
      asOf: '2024',
      period: { en: '2024 survey data', ar: 'بيانات مسح 2024' },
      note: {
        en: 'Account ownership was 23.0% of adults (indicator FX.OWN.TOTL.ZS).',
        ar: 'بلغت نسبة امتلاك الحسابات 23.0% من البالغين (المؤشر FX.OWN.TOTL.ZS).',
      },
    },
  },
];
