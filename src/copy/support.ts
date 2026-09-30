import { defineCopy } from './define';

/** Shared form messages. Plain, specific, never blaming the visitor. */
export const formMessages = defineCopy({
  en: {
    required: 'This field is required.',
    email: 'Enter a valid email address, like name@example.com.',
    phone: 'Enter a mobile number with its country code.',
    tooLong: 'This is too long. Please shorten it.',
    consent: 'Please confirm so we can reply to you.',
    summary: 'Please fix the highlighted fields.',
    network: 'We couldn’t send this. Check your connection and try again.',
    server: 'Something went wrong on our side. Please try again in a few minutes.',
    rateLimited: 'Too many attempts. Please wait a few minutes and try again.',
    unavailable: 'This form is temporarily unavailable. Please try again later, or email us.',
    sending: 'Sending…',
    optional: '(optional)',
    privacyLink: 'Privacy Policy',
  },
  ar: {
    required: 'هذا الحقل مطلوب.',
    email: 'أدخل بريداً إلكترونياً صحيحاً، مثل name@example.com.',
    phone: 'أدخل رقم الهاتف المحمول مع رمز الدولة.',
    tooLong: 'النص أطول من المسموح. يرجى اختصاره.',
    consent: 'يرجى التأكيد لنتمكن من الرد عليك.',
    summary: 'يرجى تصحيح الحقول المحددة.',
    network: 'تعذّر الإرسال. تحقّق من اتصالك وحاول مرة أخرى.',
    server: 'حدث خطأ من جهتنا. يرجى المحاولة بعد بضع دقائق.',
    rateLimited: 'محاولات كثيرة. يرجى الانتظار بضع دقائق ثم المحاولة مجدداً.',
    unavailable: 'هذا النموذج متوقف مؤقتاً. يرجى المحاولة لاحقاً أو مراسلتنا بالبريد الإلكتروني.',
    sending: 'جارٍ الإرسال…',
    optional: '(اختياري)',
    privacyLink: 'سياسة الخصوصية',
  },
});

/**
 * One application for both business audiences. The kind of business is the
 * first real question, and it is the only one: a shop and a bank fill in the
 * same six fields, and the answer routes the application to the right team
 * (src/lib/forms/deliver.ts). A separate "are you a shop or a company?"
 * control would be a second source of truth that could disagree with it.
 */
export const apply = defineCopy({
  en: {
    meta: {
      title: 'Apply to work with Shaheen Money',
      description:
        'Apply to become a Connector, or to partner with Shaheen Money as a company, bank, wallet or payment provider.',
    },
    title: 'Tell us about your business',
    lead: 'One form, whether you run a shop or a company. It takes about two minutes.',
    name: 'Your full name',
    business: 'Business name',
    type: 'What kind of business is it?',
    typeChoose: 'Choose one',
    typeHint: 'This tells us which team should read your application.',
    typeGroups: { shop: 'Shops and exchange offices', company: 'Companies and institutions' },
    types: {
      grocery: 'Grocery or mini-market',
      pharmacy: 'Pharmacy',
      phone: 'Phone or electronics shop',
      exchange: 'Exchange office',
      bank: 'Bank or financial institution',
      wallet: 'Digital wallet',
      psp: 'Payment provider or processor',
      employer: 'Employer paying staff or contractors',
      merchant: 'Merchant or online platform',
      other: 'Something else',
    },
    country: 'Country',
    city: 'City or town',
    phone: 'Mobile number',
    phoneHint: 'Include your country code. We’ll contact you on this number.',
    email: 'Email',
    message: 'Anything we should know?',
    messageHint: 'Opening hours, how many customers you serve, the corridor you care about, or a question for us.',
    consentBefore:
      'I agree that Shaheen Money may contact me about this application and handle these details as described in the',
    submit: 'Send application',
    privacyNote: 'We use these details only to review your application and contact you about it.',
    success: {
      title: 'Application received',
      body: 'Thank you. Our team will review your application and contact you on the number you gave us.',
      next: 'Back to Business',
    },
  },
  ar: {
    meta: {
      title: 'قدّم طلبك للعمل مع شاهين موني',
      description:
        'قدّم طلبك لتصبح موصّلاً، أو لتصبح شريكاً لشاهين موني كشركة أو بنك أو محفظة رقمية أو مزوّد خدمات دفع.',
    },
    title: 'احكيلنا عن شغلك',
    lead: 'فورم واحد، سواء عندك محل أو عندك شركة. بتاخد حوالي دقيقتين.',
    name: 'اسمك الكامل',
    business: 'اسم النشاط التجاري',
    type: 'شو نوع النشاط؟',
    typeChoose: 'اختر نوعاً',
    typeHint: 'هاي بتحدّد أي فريق رح يقرأ طلبك.',
    typeGroups: { shop: 'محلات ومكاتب صرافة', company: 'شركات ومؤسسات' },
    types: {
      grocery: 'بقالة أو ميني ماركت',
      pharmacy: 'صيدلية',
      phone: 'محل هواتف أو إلكترونيات',
      exchange: 'محل صرافة',
      bank: 'بنك أو مؤسسة مالية',
      wallet: 'محفظة رقمية',
      psp: 'مزوّد أو معالج خدمات دفع',
      employer: 'جهة بتدفع لموظفين أو متعاقدين',
      merchant: 'متجر أو منصة إلكترونية',
      other: 'شيء آخر',
    },
    country: 'الدولة',
    city: 'المدينة أو البلدة',
    phone: 'رقم الهاتف المحمول',
    phoneHint: 'اكتب الرقم مع رمز الدولة. سنتواصل معك على هذا الرقم.',
    email: 'البريد الإلكتروني',
    message: 'هل هناك ما يجب أن نعرفه؟',
    messageHint: 'ساعات العمل، أو عدد الزبائن، أو مسار التحويل اللي يهمك، أو أي سؤال لنا.',
    consentBefore: 'أوافق على أن تتواصل معي شاهين موني بخصوص هذا الطلب، وأن تُعالج هذه البيانات كما هو موضح في',
    submit: 'أرسل الطلب',
    privacyNote: 'نستخدم هذه البيانات فقط لمراجعة طلبك والتواصل معك بخصوصه.',
    success: {
      title: 'وصلنا طلبك',
      body: 'شكراً لك. سيراجع فريقنا طلبك ويتواصل معك على الرقم الذي أعطيتنا إياه.',
      next: 'العودة إلى صفحة الأعمال',
    },
  },
});

export const contactPage = defineCopy({
  en: {
    meta: {
      title: 'Contact Shaheen Money',
      description: 'Contact Shaheen Money about your account, a transfer, partnerships or press.',
    },
    title: 'Contact us',
    lead: 'Tell us what you need and we’ll pass it to the right team.',
    topic: 'What is this about?',
    topics: {
      support: 'Help with my account or a transfer',
      partnership: 'Partnerships',
      press: 'Press',
      other: 'Something else',
    },
    connectorNote: 'Applying as a shop or a company?',
    connectorLink: 'Use the business application',
    name: 'Your name',
    email: 'Email',
    message: 'How can we help?',
    messageHint:
      'For a transfer, include the transaction reference from the app. Never include your password, PIN or card number.',
    consentBefore: 'I agree that Shaheen Money may handle these details to reply to me, as described in the',
    submit: 'Send message',
    emailTitle: 'Email',
    channelsTitle: 'Official channels',
    securityTitle: 'Security issues',
    securityBody: 'Found a vulnerability? Our disclosure details are in security.txt.',
    pressTitle: 'Press and media',
    pressBody: 'Logos, brand rules and company documents are on the media page.',
    pressLink: 'Media and brand',
    success: {
      title: 'Message sent',
      body: 'Thanks for writing. We’ll reply to the email address you gave us.',
      next: 'Back to the homepage',
    },
  },
  ar: {
    meta: {
      title: 'تواصل مع شاهين موني',
      description: 'تواصل مع شاهين موني بخصوص حسابك أو تحويل أو الشراكات أو الإعلام.',
    },
    title: 'تواصل معنا',
    lead: 'أخبرنا بما تحتاجه وسنوصله إلى الفريق المناسب.',
    topic: 'بخصوص ماذا؟',
    topics: {
      support: 'مساعدة في حسابي أو في تحويل',
      partnership: 'الشراكات',
      press: 'الإعلام',
      other: 'موضوع آخر',
    },
    connectorNote: 'بتقدّم كمحل أو كشركة؟',
    connectorLink: 'استخدم نموذج طلب الأعمال',
    name: 'اسمك',
    email: 'البريد الإلكتروني',
    message: 'كيف يمكننا المساعدة؟',
    messageHint:
      'إذا كان الأمر يخص تحويلاً، اذكر الرقم المرجعي للعملية من التطبيق. لا تكتب أبداً كلمة المرور أو الرقم السري أو رقم البطاقة.',
    consentBefore: 'أوافق على أن تعالج شاهين موني هذه البيانات للرد عليّ، كما هو موضح في',
    submit: 'أرسل الرسالة',
    emailTitle: 'البريد الإلكتروني',
    channelsTitle: 'القنوات الرسمية',
    securityTitle: 'المشكلات الأمنية',
    securityBody: 'وجدت ثغرة؟ تفاصيل الإفصاح موجودة في ملف security.txt.',
    pressTitle: 'الإعلام والصحافة',
    pressBody: 'الشعارات وقواعد الهوية وملفات الشركة موجودة في صفحة الإعلام.',
    pressLink: 'الإعلام والهوية',
    success: {
      title: 'تم إرسال رسالتك',
      body: 'شكراً لتواصلك. سنرد على بريدك الإلكتروني.',
      next: 'العودة إلى الصفحة الرئيسية',
    },
  },
});

export const formError = defineCopy({
  en: {
    meta: { title: 'We couldn’t send that — Shaheen Money', description: 'The form could not be sent.' },
    title: 'We couldn’t send that',
    body: 'Some details were missing or not valid. Go back, check the form and send it again.',
    back: 'Go back',
  },
  ar: {
    meta: { title: 'تعذّر الإرسال | شاهين موني', description: 'تعذّر إرسال النموذج.' },
    title: 'تعذّر الإرسال',
    body: 'بعض البيانات ناقصة أو غير صحيحة. ارجع وتحقّق من النموذج ثم أرسله مجدداً.',
    back: 'رجوع',
  },
});
