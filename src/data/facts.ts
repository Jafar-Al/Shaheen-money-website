/**
 * COMPANY FACTS — the only place claims about Shaheen Money live.
 *
 * Rules (audit F.3 / T.1–T.6):
 *   · Every number is `Sourced` — value + where it comes from + as-of date.
 *   · Anything left `null` or empty is simply not rendered in production.
 *     Sections that depend on it disappear rather than show a placeholder.
 *   · Preview builds (PUBLIC_SHOW_CONTENT_GAPS=true, and `npm run dev`) show a
 *     dashed "content needed" marker in each empty slot instead.
 *   · `npm run check:launch` lists every empty slot and fails until the
 *     launch-critical ones are filled.
 *
 * Nothing here may be estimated. If a figure cannot be sourced, leave it out.
 * Legal, licensing and pricing entries should be changed with two-person
 * review (threat model A11).
 */
import type {
  CoverageEntry,
  FeeRow,
  Licence,
  Localized,
  Person,
  PressItem,
  PricingComparison,
  Rating,
  Sourced,
  Testimonial,
} from './types';

export interface Facts {
  company: {
    legalName: string | null;
    registrationNumber: string | null;
    registeredAddress: Localized | null;
    jurisdiction: Localized | null;
    /**
     * Where the company can be reached, as published on its own channels.
     * Not the registered address (that is a separate, legal fact above).
     */
    office: Sourced<{ address: string; phone: string }> | null;
  };
  /** Money-transmission / e-money licences or registrations. */
  licences: Licence[];
  /** How customer funds are held, e.g. "held 1:1 in segregated accounts at …". */
  safeguarding: Sourced<Localized> | null;
  /** What a "digital dollar" balance is and what backs it (audit B.2). */
  digitalDollar: Sourced<Localized> | null;
  ratings: { ios: Sourced<Rating> | null; android: Sourced<Rating> | null };
  network: {
    countries: Sourced<number> | null;
    activeConnectors: Sourced<number> | null;
  };
  coverage: Sourced<CoverageEntry[]> | null;
  pricing: {
    minCashOutUsd: Sourced<number> | null;
    /** Only set if the app genuinely applies no FX margin. */
    noFxMargin: Sourced<true> | null;
    schedule: Sourced<FeeRow[]> | null;
    comparison: Sourced<PricingComparison> | null;
  };
  connectorProgram: {
    commissionPercent: Sourced<number> | null;
    /** Who can become a Connector, one requirement per line. */
    eligibility: Sourced<Localized[]> | null;
  };
  testimonials: Testimonial[];
  connectorStory: Testimonial | null;
  press: PressItem[];
  team: Person[];
}

export const facts: Facts = {
  company: {
    /**
     * The company behind the trade name, as the owner stated it on
     * 1 October 2026 and as the company's own privacy policy names it
     * ("Bankey LLC, doing business as Shaheen Money"). No licence is
     * claimed anywhere on the site.
     */
    legalName: 'Bankey LLC',
    registrationNumber: null,
    registeredAddress: null,
    jurisdiction: { en: 'Washington, D.C., United States', ar: 'واشنطن العاصمة، الولايات المتحدة' },
    /**
     * From the Shaheen Money Facebook page's intro, supplied by the owner
     * as a screenshot on 30 September 2026. A US postal address and phone
     * number: shown in Latin script in both locales, isolated left to right.
     */
    office: {
      value: {
        address: '1100 15th Street NW, Washington, DC, United States',
        phone: '+1 240-600-0946',
      },
      source: {
        name: { en: 'Shaheen Money on Facebook', ar: 'صفحة شاهين موني على فيسبوك' },
        url: 'https://www.facebook.com/people/Shaheen/61571378790273/',
        asOf: '2026-09-30',
      },
    },
  },
  licences: [],
  /**
   * Shaheen Money never takes custody. That is a stronger answer to "how
   * are my funds protected" than any safeguarding arrangement, so it is
   * stated plainly rather than softened.
   */
  safeguarding: {
    value: {
      en: 'Shaheen Money does not hold your money and does not own it. It is a self-custodial, decentralised wallet: your balance stays under your own control, and Shaheen Money acts only as the intermediary that carries out your instructions.',
      ar: 'شاهين موني لا تحتفظ بأموالك ولا تملكها. فهي محفظة سيادية لا مركزية: يبقى رصيدك تحت سيطرتك أنت، ويقتصر دور شاهين موني على الوسيط الذي ينفّذ تعليماتك.',
    },
    source: {
      name: { en: 'Shaheen Money', ar: 'شاهين موني' },
      asOf: '2026-10-01',
    },
  },

  /**
   * What a digital dollar is and what backs it, sourced to the US federal
   * law on payment stablecoins rather than asserted by the company: the
   * GENIUS Act, sections 4(a)(1)(A) (reserves at least 1 to 1, and which
   * assets count), 4(a)(1)(C) and 4(a)(3) (monthly published composition,
   * examined monthly by a registered public accounting firm) and 4(e)(1)
   * (not government-backed, not deposit-insured). Checked against the
   * statute's text on govinfo.gov on 1 October 2026.
   */
  digitalDollar: {
    value: {
      en: 'A digital dollar in your Shaheen Money wallet is a stablecoin: a digital token designed to keep a value of one US dollar. In the United States, the GENIUS Act of July 2025 sets the rules for payment stablecoins: a permitted issuer must back them at least one to one with reserves such as US dollars, insured bank deposits and short-term Treasury bills, publish the make-up of those reserves every month, and have that report examined each month by a registered public accounting firm. A stablecoin is not a bank deposit, is not insured by the FDIC, and is not issued by Shaheen Money. Your balance keeps its dollar value until you use it, instead of following your local currency.',
      ar: 'الدولار الرقمي في محفظة شاهين موني عملةٌ مستقرة: رمزٌ رقمي مصمَّم ليحافظ على قيمة دولار أمريكي واحد. وفي الولايات المتحدة، ينظّم قانون GENIUS الصادر في تموز 2025 العملات المستقرة المخصّصة للدفع: إذ يُلزم المُصدِر المرخَّص بأن يغطّيها بنسبة واحد إلى واحد على الأقل باحتياطيات مثل الدولار الأمريكي والودائع المصرفية المؤمَّنة وأذونات الخزانة قصيرة الأجل، وأن ينشر تركيبة هذه الاحتياطيات كل شهر، وأن تفحص شركة محاسبة عامة مسجَّلة هذا التقرير شهرياً. والعملة المستقرة ليست وديعة مصرفية، ولا تؤمّنها المؤسسة الفيدرالية للتأمين على الودائع، ولا تُصدرها شاهين موني. ويحافظ رصيدك على قيمته بالدولار حتى تستخدمه، بدل أن يتبع عملتك المحلية.',
    },
    source: {
      name: {
        en: 'GENIUS Act, US Public Law 119-27, sections 4(a) and 4(e)',
        ar: 'قانون GENIUS، القانون العام الأمريكي 119-27، المادتان 4(a) و4(e)',
      },
      url: 'https://www.govinfo.gov/content/pkg/PLAW-119publ27/html/PLAW-119publ27.htm',
      asOf: '2025-07-18',
    },
  },
  ratings: { ios: null, android: null },
  network: { countries: null, activeConnectors: null },
  coverage: null,
  pricing: {
    minCashOutUsd: null,
    noFxMargin: null,
    /**
     * Only what the company has confirmed. Cash-out is deliberately absent
     * rather than guessed: a fee table that lists the free things and omits
     * the one that might cost money would be worse than no table.
     */
    schedule: {
      value: [
        {
          item: { en: 'Receiving money', ar: 'استقبال الأموال' },
          fee: { en: 'No fee', ar: 'بدون رسوم' },
        },
        {
          item: { en: 'Sending money', ar: 'إرسال الأموال' },
          fee: { en: 'No fee', ar: 'بدون رسوم' },
        },
        {
          item: { en: 'Paying from your balance', ar: 'الدفع من رصيدك' },
          fee: { en: 'No fee', ar: 'بدون رسوم' },
        },
      ],
      source: {
        name: { en: 'Shaheen Money', ar: 'شاهين موني' },
        asOf: '2026-09-29',
      },
    },
    comparison: null,
  },
  connectorProgram: { commissionPercent: null, eligibility: null },
  testimonials: [],
  connectorStory: null,
  press: [],
  team: [
    {
      // Published on the current About page.
      name: 'Moataz Alobaid',
      role: { en: 'Founder & CEO', ar: 'المؤسس والرئيس التنفيذي' },
    },
  ],
};
