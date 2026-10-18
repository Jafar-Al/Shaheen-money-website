/**
 * Sitewide constants. Store and social URLs are configuration under code
 * review (threat model A6): scripts/check-dist.mjs fails the build if any
 * rendered store link differs from these.
 */
export const SITE_URL = 'https://shaheen.money';

export const brand = {
  name: 'Shaheen Money',
  nameAr: 'شاهين موني',
  taglinePrimary: { en: 'Money Without Borders. Access Without Limits.', ar: 'المال بلا حدود. الوصول بلا قيود.' },
  taglineSecondary: { en: 'Digital dollars, real-world access.', ar: 'دولارات رقمية، وصول حقيقي.' },
} as const;

export const stores = {
  // `ct` is the App Store campaign token carried over from the old site
  // ("Empowch W Arabic"). Rename it in App Store Connect if you want website
  // installs attributed to a current campaign; `pt` is the provider token.
  ios: 'https://apps.apple.com/us/app/shaheen-money/id1601795189?ct=Empowch+W+Arabic&pt=121258621',
  android: 'https://play.google.com/store/apps/details?id=com.app.bankey.Shaheen',
} as const;

export const contact = {
  email: 'hello@shaheen.money',
  // Monitored contact for vulnerability reports (/.well-known/security.txt).
  // A dedicated security@ mailbox is better; update both places if you add one.
  securityEmail: 'hello@shaheen.money',
} as const;

export type SocialNetwork = 'instagram' | 'facebook' | 'linkedin' | 'tiktok' | 'youtube' | 'whatsapp';

export const socials: ReadonlyArray<{ network: SocialNetwork; label: string; href: string }> = [
  { network: 'instagram', label: 'Instagram', href: 'https://www.instagram.com/shaheen_money/' },
  { network: 'facebook', label: 'Facebook', href: 'https://www.facebook.com/people/Shaheen/61571378790273/' },
  { network: 'linkedin', label: 'LinkedIn', href: 'https://www.linkedin.com/company/shaheenmoney' },
  { network: 'tiktok', label: 'TikTok', href: 'https://www.tiktok.com/@shaheen_money' },
  { network: 'youtube', label: 'YouTube', href: 'https://www.youtube.com/@shaheenmoney' },
  { network: 'whatsapp', label: 'WhatsApp channel', href: 'https://whatsapp.com/channel/0029VbAlkwh7YSd7szqJhB2Q' },
];
