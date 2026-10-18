import type { ImageMetadata } from 'astro';
import type { Locale } from '../i18n/config';

export type Localized<T = string> = Record<Locale, T>;

/**
 * Where a figure comes from. Required wherever a number is shown
 * (audit F.3 rule 1: "Every number carries a source and an as-of date,
 * or it does not ship").
 */
export interface Source {
  name: Localized;
  url?: string;
  /** ISO date or partial date: 2025, 2025-09, 2025-09-30. */
  asOf: string;
  /** Human wording for the period when a date alone misleads, e.g. "Q3 2025". */
  period?: Localized;
  /** How the figure was derived, if it is not quoted directly. */
  note?: Localized;
}

/** A value that cannot be rendered without its source. */
export interface Sourced<T> {
  value: T;
  source: Source;
}

export interface Licence {
  regulator: Localized;
  licenceType: Localized;
  number: string;
  jurisdiction: Localized;
  /** Public register entry a visitor can check. */
  registerUrl?: string;
}

export interface Rating {
  score: number;
  count: number;
}

export interface CoverageEntry {
  iso2: string;
  country: Localized;
  receive: boolean;
  cashOut: boolean;
  note?: Localized;
}

export interface FeeRow {
  item: Localized;
  fee: Localized;
  note?: Localized;
}

export interface ComparisonRow {
  provider: Localized;
  /** Upfront fee in USD. */
  fee: number;
  /** Exchange-rate margin over the mid-market rate, in percent. */
  fxMarginPercent: number;
  isShaheen?: boolean;
}

export interface PricingComparison {
  corridor: Localized;
  amountUsd: number;
  rows: ComparisonRow[];
}

export interface Testimonial {
  name: string;
  location: Localized;
  quote: Localized;
  photo?: ImageMetadata;
  /** Date written consent to publish was recorded (audit F.3 rule 5). */
  consentRecordedOn: string;
}

export interface PressItem {
  outlet: string;
  title: Localized;
  url: string;
  date: string;
}

export interface Person {
  name: string;
  /** Arabic spelling of the name as the person writes it. */
  nameAr?: string;
  role: Localized;
  photo?: ImageMetadata;
}
