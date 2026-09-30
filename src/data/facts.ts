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
    legalName: null,
    registrationNumber: null,
    registeredAddress: null,
    jurisdiction: null,
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
      en: 'Shaheen Money does not hold your money and does not own your balance. The wallet is self-custodial: your balance stays under your own control, and Shaheen Money moves value on your instruction rather than holding it on your behalf.',
      ar: 'شاهين موني ما بتحتفظ بفلوسك وما بتملك رصيدك. المحفظة سيادية: رصيدك بيضل تحت سيطرتك إنت، وشاهين موني بتحرّك القيمة بناءً على أمرك، مش بتحتفظ فيها بدالك.',
    },
    source: {
      name: { en: 'Shaheen Money', ar: 'شاهين موني' },
      asOf: '2026-09-29',
    },
  },

  /**
   * What a digital dollar is, defined generically and sourced to the
   * Federal Reserve rather than asserted by the company. Which stablecoin
   * the wallet actually uses, and who issues it, is a separate fact the
   * company still has to supply (see check:launch).
   */
  digitalDollar: {
    value: {
      en: 'A digital dollar in your Shaheen Money wallet is a stablecoin: a token issued on a public blockchain whose value is pegged to the US dollar and held to that peg by reserves its issuer publishes. It is not a bank deposit, and it is not issued by Shaheen Money. Your balance keeps its dollar value until you use it, instead of following your local currency.',
      ar: 'الدولار الرقمي في محفظة شاهين موني هو عملة مستقرة: رمز مُصدَر على بلوكتشين عامة، قيمته مربوطة بالدولار الأمريكي ومدعومة باحتياطيات ينشرها مُصدِره. وهو ليس وديعة بنكية، وليست شاهين موني مُصدِره. رصيدك بيحافظ على قيمته بالدولار لحد ما تستخدمه، بدل ما يتبع عملتك المحلية.',
    },
    source: {
      name: {
        en: 'Federal Reserve, FEDS Notes, “The stable in stablecoins”',
        ar: 'الاحتياطي الفيدرالي الأمريكي، سلسلة FEDS Notes',
      },
      url: 'https://www.federalreserve.gov/econres/notes/feds-notes/the-stable-in-stablecoins-20221216.html',
      asOf: '2022-12-16',
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
