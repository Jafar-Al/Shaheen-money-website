import { defineCopy } from './define';

/**
 * The business page, for the two audiences who arrive wanting to work with
 * Shaheen rather than use the app:
 *
 *  · the shop owner who wants to hand out cash and earn on it (Connectors);
 *  · the company, bank, wallet or payment provider who wants to connect
 *    (partners).
 *
 * They want completely different things, so the page forks in the first
 * screen and never makes either read the other's section. One application
 * form serves both: its first question is which of the two you are.
 */
export const business = defineCopy({
  en: {
    meta: {
      title: 'Business — Shaheen Money for shops, companies and partners',
      description:
        'Turn your shop into a cash access point, pay people across borders, or connect your bank, wallet or payment network to Shaheen Money.',
    },
    title: 'Two ways to build on Shaheen.',
    lead:
      'A shop that hands out cash to its neighbourhood, and an institution that connects its rails to ours. Both make the same network worth more.',
    chooser: {
      label: 'Where do you fit?',
      connector: {
        title: 'I run a shop',
        body: 'Become a Connector: hand out cash to Shaheen Money users in your area and earn on every transaction.',
        cta: 'See how Connectors work',
      },
      partner: {
        title: 'I run a company',
        body: 'Pay people across borders, accept digital dollars, or connect your bank, wallet or payment network to ours.',
        cta: 'See partnership options',
      },
    },
    connectors: {
      label: 'For shops',
      title: 'Turn your shop into a cash access point.',
      lead:
        'Connectors are local businesses that hand out cash to Shaheen Money users in their neighbourhood, and earn on every cash-out.',
      whyTitle: 'Why shops join',
      why: [
        { title: 'Earn on every cash-out', body: 'You earn a commission each time you hand over cash to a Shaheen Money user.' },
        { title: 'More people through your door', body: 'Every cash-out is a customer in your shop.' },
        { title: 'Serve your neighbours', body: 'Give people nearby a way to receive money from abroad without a trip to a bank.' },
      ],
      commission: (pct: string) => `Commission: ${pct} per cash-out.`,
      stepsTitle: 'How to join',
      steps: [
        { title: 'Apply online', body: 'Tell us about your shop. It takes about two minutes.' },
        { title: 'We review and call you', body: 'Our team reviews every application and contacts you on the number you give us.' },
        { title: 'Get set up', body: 'If your shop is a fit, we walk you through setup.' },
      ],
      askTitle: 'What we’ll ask for',
      ask: ['Your name and your shop’s name', 'The type of business', 'Country and city', 'A phone number we can reach you on'],
      eligibilityTitle: 'Who can apply',
      cta: 'Apply to become a Connector',
    },
    partners: {
      label: 'For companies and institutions',
      title: 'Connect your rails to ours.',
      lead:
        'We are not trying to replace banks, wallets or payment providers. We are trying to connect them, so money can cross between them the way a message does.',
      offers: [
        {
          title: 'Pay people across borders',
          body: 'Pay staff, contractors or suppliers in digital dollars, and let them take it as cash where they live.',
        },
        {
          title: 'Accept digital dollars',
          body: 'Take payment from Shaheen Money balances in your shop, your platform or your app.',
        },
        {
          title: 'Connect a bank, wallet or network',
          body: 'Interoperate with the Shaheen network so your customers can send to and receive from ours.',
        },
        {
          title: 'Build a corridor with us',
          body: 'Open a new country or corridor together, with local licensing, settlement and cash-out.',
        },
      ],
      lookingTitle: 'What we look for',
      looking: [
        'A licence or registration appropriate to what you do, in the market you operate in.',
        'A real compliance function: KYC, sanctions screening and transaction monitoring.',
        'Somebody accountable for the relationship on your side.',
        'A corridor or a customer base where cash still matters.',
      ],
      cta: 'Talk to our partnerships team',
    },
    materials: {
      label: 'Company materials',
      title: 'The documents you’ll want before a first call.',
      lead: 'For partners, investors and journalists.',
      mediaCta: 'Logos and press kit',
    },
    questions: 'Questions first?',
    contact: 'Talk to us',
  },
  ar: {
    meta: {
      title: 'الأعمال | شاهين موني للمحلات والشركات والشركاء',
      description:
        'حوّل محلك لنقطة سحب كاش، أو ادفع لناس عبر الحدود، أو اربط بنكك أو محفظتك أو شبكة الدفع عندك مع شاهين موني.',
    },
    title: 'طريقتين تشتغل فيهم مع شاهين.',
    lead:
      'محل بيسلّم كاش لأهل حارته، ومؤسسة بتربط أنظمتها بأنظمتنا. الاثنين بيزيدوا قيمة نفس الشبكة.',
    chooser: {
      label: 'إنت مين فيهم؟',
      connector: {
        title: 'عندي محل',
        body: 'صير موصّل: سلّم كاش لمستخدمي شاهين موني بمنطقتك واكسب من كل عملية.',
        cta: 'شوف كيف بيشتغل الموصّلون',
      },
      partner: {
        title: 'عندي شركة',
        body: 'ادفع لناس عبر الحدود، أو اقبل الدولار الرقمي، أو اربط بنكك أو محفظتك أو شبكة الدفع عندك مع شبكتنا.',
        cta: 'شوف خيارات الشراكة',
      },
    },
    connectors: {
      label: 'للمحلات',
      title: 'حوّل محلك لنقطة سحب كاش.',
      lead: 'الموصّلون محلات من الحي بتسلّم الكاش لمستخدمي شاهين موني بمنطقتها، وبتكسب من كل عملية سحب.',
      whyTitle: 'ليش المحلات بتنضم',
      why: [
        { title: 'اكسب من كل عملية سحب', body: 'بتاخد عمولة كل مرة بتسلّم فيها كاش لمستخدم شاهين موني.' },
        { title: 'زباين أكثر بمحلك', body: 'كل عملية سحب يعني زبون داخل على محلك.' },
        { title: 'اخدم جيرانك', body: 'خلّي الناس اللي حواليك يستقبلوا مصاري من برّا بدون مشوار للبنك.' },
      ],
      commission: (pct: string) => `العمولة: ${pct} على كل عملية سحب.`,
      stepsTitle: 'كيف بتنضم',
      steps: [
        { title: 'قدّم أونلاين', body: 'احكيلنا عن محلك. بتاخد حوالي دقيقتين.' },
        { title: 'منراجع ومنتصل فيك', body: 'فريقنا بيراجع كل طلب وبيتواصل معك على الرقم اللي بتعطينا ياه.' },
        { title: 'منجهّزك', body: 'إذا محلك مناسب، منساعدك بخطوات التجهيز.' },
      ],
      askTitle: 'شو رح نطلب منك',
      ask: ['اسمك واسم محلك', 'نوع المحل', 'الدولة والمدينة', 'رقم موبايل منقدر نتواصل معك عليه'],
      eligibilityTitle: 'مين فيه يقدّم',
      cta: 'قدّم لتصير موصّل',
    },
    partners: {
      label: 'للشركات والمؤسسات',
      title: 'اربط أنظمتك بأنظمتنا.',
      lead:
        'إحنا مش عم نحاول نستبدل البنوك والمحافظ ومزوّدي الدفع، إحنا عم نحاول نربطهم، ليصير المال يعبر بينهم متل ما بتعبر الرسالة.',
      offers: [
        {
          title: 'ادفع لناس عبر الحدود',
          body: 'ادفع لموظفينك أو المتعاقدين أو المورّدين بالدولار الرقمي، وخليهم ياخدوه كاش بالبلد اللي عايشين فيه.',
        },
        {
          title: 'اقبل الدولار الرقمي',
          body: 'استقبل الدفع من أرصدة شاهين موني بمحلك أو منصتك أو تطبيقك.',
        },
        {
          title: 'اربط بنك أو محفظة أو شبكة',
          body: 'اربط أنظمتك مع شبكة شاهين ليقدر زبائنك يبعتوا ويستقبلوا من زبائننا.',
        },
        {
          title: 'افتح مسار جديد معنا',
          body: 'نفتح سوياً دولة أو مسار تحويل جديد، مع الترخيص والتسوية والسحب النقدي محلياً.',
        },
      ],
      lookingTitle: 'شو بندوّر عليه',
      looking: [
        'ترخيص أو تسجيل مناسب لطبيعة شغلك، في السوق اللي بتشتغل فيه.',
        'قسم امتثال حقيقي: التحقق من الهوية، وفحص العقوبات، ومراقبة العمليات.',
        'شخص مسؤول عن العلاقة من طرفكم.',
        'مسار تحويل أو قاعدة زباين لسّا الكاش مهم فيها.',
      ],
      cta: 'احكي مع فريق الشراكات',
    },
    materials: {
      label: 'ملفات الشركة',
      title: 'الملفات اللي بتحتاجها قبل أول اجتماع.',
      lead: 'للشركاء والمستثمرين والصحافة.',
      mediaCta: 'الشعارات والملف الصحفي',
    },
    questions: 'عندك أسئلة قبل؟',
    contact: 'احكي معنا',
  },
});

export const media = defineCopy({
  en: {
    meta: {
      title: 'Media and brand — Shaheen Money',
      description:
        'Shaheen Money logos, brand colours, typography and company documents, with the rules for using them, and who to contact for press.',
    },
    title: 'Media and brand',
    lead:
      'The falcon, the colours and the type, in the files we actually use. Take them from here rather than from a screenshot of the site.',
    logoTitle: 'The mark',
    logoLead:
      'One mark, two colourways. Everything below is generated from the same vector master the website renders, so the file you download is the mark, not a copy of it.',
    download: 'Download',
    rulesTitle: 'Using the mark',
    rules: [
      { title: 'Keep it clear', body: 'Leave clear space around the mark of at least half its height on every side.' },
      { title: 'Keep it legible', body: 'Never render the mark smaller than 24 pixels, or 8 millimetres in print.' },
      { title: 'Keep the colours', body: 'Navy on light, white on navy. Do not recolour the mark, rotate it, outline it or add effects.' },
      {
        title: 'Keep it separate',
        body: 'Do not lock the mark up with another logo, and do not use it to suggest a partnership that does not exist.',
      },
    ],
    coloursTitle: 'Colours',
    coloursLead: 'Cyan is an accent for dark surfaces only. Brand blue is for light surfaces only. Neither passes contrast on the other.',
    typeTitle: 'Typography',
    typeLead: 'All three are open-licensed, so you can use them in your own layout.',
    licence: 'Licence',
    docsTitle: 'Company documents',
    pressTitle: 'Press enquiries',
    pressBody: 'For interviews, comment or anything else, write to us and say it is a press enquiry.',
    pressCta: 'Contact us',
    factsTitle: 'The facts',
    founded: 'Founder and CEO',
    description: 'What Shaheen Money is',
    descriptionBody:
      'A digital-dollar wallet that lets people receive money from abroad, hold it in US dollars, send and pay, and collect it as cash from a Connector: a local shop in the Shaheen network.',
  },
  ar: {
    meta: {
      title: 'الإعلام والهوية | شاهين موني',
      description:
        'شعارات شاهين موني وألوانها وخطوطها وملفات الشركة، مع قواعد استخدامها، ومع من تتواصل للاستفسارات الصحفية.',
    },
    title: 'الإعلام والهوية',
    lead: 'الصقر والألوان والخطوط، بالملفات اللي منستخدمها فعلياً. خذها من هون، مش من صورة للموقع.',
    logoTitle: 'الشعار',
    logoLead:
      'شعار واحد بلونين. كل الملفات تحت مولّدة من نفس الملف المتجهي اللي بيعرضه الموقع، فاللي بتنزّله هو الشعار نفسه مش نسخة عنه.',
    download: 'تنزيل',
    rulesTitle: 'استخدام الشعار',
    rules: [
      { title: 'اترك مساحة حوله', body: 'اترك مساحة فارغة حول الشعار لا تقل عن نصف ارتفاعه من كل جهة.' },
      { title: 'خلّيه واضح', body: 'لا تعرض الشعار بحجم أصغر من 24 بكسل، أو 8 ملليمترات في الطباعة.' },
      {
        title: 'حافظ على الألوان',
        body: 'كحلي على الفاتح، وأبيض على الكحلي. لا تغيّر لون الشعار ولا تدوّره ولا تضيف له حدوداً أو تأثيرات.',
      },
      {
        title: 'خلّيه لحاله',
        body: 'لا تدمج الشعار مع شعار آخر، ولا تستخدمه بشكل يوحي بشراكة غير موجودة.',
      },
    ],
    coloursTitle: 'الألوان',
    coloursLead: 'السماوي لمسة للأسطح الداكنة فقط، والأزرق للأسطح الفاتحة فقط. ولا واحد منهما يحقق التباين المطلوب على الآخر.',
    typeTitle: 'الخطوط',
    typeLead: 'الخطوط الثلاثة مفتوحة الترخيص، فبتقدر تستخدمها بتصميمك.',
    licence: 'الترخيص',
    docsTitle: 'ملفات الشركة',
    pressTitle: 'الاستفسارات الصحفية',
    pressBody: 'للمقابلات أو التعليقات أو أي شيء آخر، راسلنا واذكر أن الاستفسار صحفي.',
    pressCta: 'تواصل معنا',
    factsTitle: 'معلومات أساسية',
    founded: 'المؤسس والرئيس التنفيذي',
    description: 'ما هو شاهين موني',
    descriptionBody:
      'محفظة بالدولار الرقمي بتخلي الناس تستقبل أموالها من الخارج، وتحتفظ فيها بالدولار الأمريكي، وتبعت وتدفع، وتستلمها كاش من موصّل: محل قريب ضمن شبكة شاهين.',
  },
});
