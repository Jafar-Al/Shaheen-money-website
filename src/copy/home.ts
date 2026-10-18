import { defineCopy } from './define';

/**
 * The homepage is short on purpose. It serves two visitors and never makes
 * the first one scroll past anything to leave:
 *
 *  1. the one who came to download: the falcon, one slogan and one button
 *     that knows the device, all inside the first screen;
 *  2. the one who wants to understand first, in the order they ask: how it
 *     works (with the 10-second film), where the cash comes from, what it
 *     costs, where it works, and the questions we are asked most.
 *
 * One idea per section, a sentence or two each. Anything longer lives on
 * its own page (About, Business, Security).
 *
 * The sections marked (was …) carry the content of pages the site no longer
 * has. Their URLs still resolve (src/config/redirects.mjs).
 */
export const home = defineCopy({
  en: {
    meta: {
      title: 'Shaheen Money — Receive money from abroad. Cash it out near you.',
      description:
        'A digital-dollar wallet for families, freelancers and businesses. Receive money from abroad, hold it in digital dollars, and cash it out through a Connector near you.',
    },
    hero: {
      title: ['Money without borders.', 'Access without limits.'],
      subtitle: 'Receive money from abroad, hold it in digital dollars, and collect it as cash from a shop near you.',
      explore: 'How it works',
      evidence: {
        countries: (n: string) => `Live in ${n} countries`,
        minCashOut: (amount: string) => `Cash out from ${amount}`,
        connectors: (n: string) => `${n} Connectors`,
        noFxMargin: 'No hidden exchange-rate margin',
        /* Only shown while the fee schedule (facts.pricing.schedule) says so. */
        noFees: 'No fees to receive, send or pay',
      },
    },
    /* was /how-it-works */
    steps: {
      label: 'How it works',
      title: 'Four steps, *one app.*',
      lead: 'From a transfer abroad to cash in your hand. You choose where to stop.',
      items: [
        { title: 'Receive', body: 'Money comes from family, a client or an employer, and shows in your balance when it arrives.' },
        { title: 'Hold in dollars', body: 'Your balance is held in digital dollars, not in your local currency. You decide when to use it.' },
        { title: 'Send and pay', body: 'Send part of your balance to someone else, or pay straight from the app.' },
        { title: 'Cash out', body: 'Ask for cash in the app and collect it from a Connector: a local shop in the Shaheen network.' },
      ],
      dollarTitle: 'What is a digital dollar?',
    },
    /* The 10-second film beside the steps (public/media/shaheen-money-film.mp4). */
    film: {
      alt: 'A ten-second film: your money as cash in your hand. Receive from abroad, hold it in dollars, send or pay, take it out as cash.',
      play: 'Play the film',
      pause: 'Pause the film',
    },
    /* was /cash-out */
    cashOut: {
      label: 'Cash out',
      title: 'Cash from a shop you *already know.*',
      lead:
        'Connectors are local shops in the Shaheen network. They hand you the cash, so your digital balance becomes money in your hand.',
      steps: [
        { title: 'Ask for cash in the app', body: 'Choose how much you want to take out.' },
        { title: 'Visit a Connector', body: 'Go to a Connector near you.' },
        { title: 'Collect your cash', body: 'Count it before you leave.' },
      ],
      minimum: (amount: string) => `The smallest cash-out is ${amount}.`,
    },
    /* was /pricing */
    cost: {
      label: 'What it costs',
      title: 'Zero commission *on Shaheen.*',
      lead: 'Receiving, sending and paying cost nothing.',
      benchmark: 'For reference, the global average cost of sending money is',
      scheduleTitle: 'What we charge',
      /* The list is three lines long and every line says nothing. Without
         this sentence a reader could take it for the whole schedule; with
         it, the page promises where the rest will appear. */
      scheduleNote: 'Any other charge will be listed here, with the date it applies from, before it reaches you.',
      item: 'Item',
      fee: 'Fee',
    },
    network: {
      label: 'The network',
      title: 'Cities apart. *Connected* by Shaheen.',
      lead:
        'Shaheen carries money from the city where someone earns to the town where their family lives. A Connector near home hands it over as cash.',
      caption: 'Example corridors. Ask us about your country and we will tell you what is available today.',
      figures: (connectors: string, countries: string, month: string) =>
        `As of ${month}, ${connectors} active Connectors across ${countries} countries.`,
      coverageCta: 'Ask about your country',
      globeLabel: 'Globe showing example money corridors between cities',
      merchant: {
        label: 'For shop owners',
        title: 'Run a shop? Become a Connector.',
        body: 'Give your neighborhood a place to cash out, and earn on every transaction you handle.',
        commission: (pct: string) => `Earn ${pct} on every cash-out.`,
        cta: 'Become a Connector',
      },
    },
    proof: {
      label: 'In their words',
      title: 'People who use Shaheen Money.',
      ratingsTitle: 'App store ratings',
      pressTitle: 'In the press',
      securityCta: 'How we keep your money safe',
    },
    /* was /help */
    faq: {
      label: 'Questions',
      title: 'The things people ask us *most.*',
      stillTitle: 'Still need help?',
      stillCta: 'Contact us',
      items: [
        {
          q: 'What is Shaheen Money?',
          a: 'A mobile wallet for receiving money from abroad, holding it in digital dollars, sending and paying, and collecting cash from Connectors near you.',
        },
        {
          q: 'What are digital dollars?',
          a: 'A balance held in US dollars in your Shaheen Money wallet, not in your local currency. It keeps its dollar value until you use it.',
          link: 'security' as const,
        },
        {
          q: 'How do I get the app?',
          a: 'Download it from the App Store or Google Play using the links on this site. Only install it from those links.',
          link: 'getApp' as const,
        },
        {
          q: 'Which countries does Shaheen Money work in?',
          a: 'We are preparing a verified country list. Until it is published, ask us about your corridor and we will tell you what is available.',
          link: 'contact' as const,
        },
        {
          q: 'How do I become a Connector?',
          a: 'Apply online from the business page. Our team reviews every application and contacts you on the number you give us.',
          link: 'business' as const,
        },
        {
          q: 'Something went wrong with a transfer. What do I do?',
          a: 'Contact us and choose “Help with my account or a transfer”. Include the transaction reference from the app. Never send your password or PIN.',
          link: 'contact' as const,
        },
        {
          q: 'How do I report a security issue or a scam?',
          a: 'Our security page lists our official channels and how to report a vulnerability or someone pretending to be us.',
          link: 'security' as const,
        },
      ],
    },
    /**
     * The cash slip on the Cash out section. The screens follow the owner's
     * screenshots; the amount and the code are an example, and the slip is
     * stamped "Illustrative": it shows what the app does, never what anyone
     * holds.
     */
    app: {
      collect: {
        title: 'Collect your cash',
        at: 'At a Connector near you',
        amount: '$200.00',
        codeLabel: 'Show this code',
        code: '482 719',
        note: 'The Connector enters the code, then hands you the cash.',
      },
    },
    final: {
      title: 'Your money. *Anywhere.*',
      lead: 'Receive from abroad, send anywhere, and cash out close to home.',
      steps: ['Download the app', 'Create your account', 'Receive your first transfer'],
      stepsLabel: 'Getting started',
    },
  },
  ar: {
    meta: {
      title: 'شاهين موني | استقبل فلوسك من برّا، واسحبها كاش جنبك',
      description:
        'محفظة بالدولار الرقمي للعائلات والمستقلين وأصحاب الأعمال. استقبل أموالك من الخارج، واحتفظ بها بالدولار الرقمي، واسحبها كاش من موصّل قريب منك.',
    },
    hero: {
      title: ['أموالك بلا حدود.', 'وصولك بلا قيود.'],
      subtitle: 'استقبل مصاريك من برّا، واحتفظ فيها بالدولار الرقمي، واسحبها كاش من محل قريب منك.',
      explore: 'كيف بيشتغل',
      evidence: {
        countries: (n: string) => `متوفر في ${n} دولة`,
        minCashOut: (amount: string) => `سحب كاش ابتداءً من ${amount}`,
        connectors: (n: string) => `${n} موصّل`,
        noFxMargin: 'بدون هامش مخفي على سعر الصرف',
        noFees: 'بدون رسوم على الاستقبال والإرسال والدفع',
      },
    },
    steps: {
      label: 'كيف بيشتغل',
      title: 'أربع خطوات، *تطبيق واحد.*',
      lead: 'من حوالة بالخارج لكاش بإيدك، وإنت بتقرر وين بدك توقف.',
      items: [
        { title: 'استقبل', body: 'بتوصلك المصاري من أهلك أو عميل أو شغلك برّا، وبتظهر برصيدك أول ما توصل.' },
        { title: 'احتفظ بالدولار', body: 'رصيدك محفوظ بالدولار الرقمي، مش بعملتك المحلية، وإنت بتقرر إمتى تستخدمه.' },
        { title: 'ابعت وادفع', body: 'ابعت جزء من رصيدك لحدا تاني، أو ادفع مباشرة من التطبيق.' },
        { title: 'اسحب كاش', body: 'اطلب الكاش من التطبيق واستلمه من موصّل: محل قريب منك ضمن شبكة شاهين.' },
      ],
      dollarTitle: 'شو يعني دولار رقمي؟',
    },
    film: {
      alt: 'فيديو مدته عشر ثوانٍ: فلوسك كاش بإيدك. استقبل من برّا، احتفظ فيها بالدولار، ابعت أو ادفع، واسحبها كاش.',
      play: 'شغّل الفيديو',
      pause: 'أوقف الفيديو',
    },
    cashOut: {
      label: 'السحب النقدي',
      title: 'كاش من محل *بتعرفه.*',
      lead: 'الموصّلون محلات من الحي ضمن شبكة شاهين، بيسلّموك الكاش، وهيك رصيدك الرقمي بيصير مصاري بإيدك.',
      steps: [
        { title: 'اطلب كاش من التطبيق', body: 'اختار قديش بدك تسحب.' },
        { title: 'روح لموصّل', body: 'روح لموصّل قريب منك.' },
        { title: 'استلم مصاريك', body: 'عدّها قبل ما تطلع.' },
      ],
      minimum: (amount: string) => `أقل مبلغ للسحب هو ${amount}.`,
    },
    cost: {
      label: 'الكلفة',
      title: 'صفر عمولة *على شاهين.*',
      lead: 'استقبال الأموال وإرسالها والدفع من رصيدك دون أي رسوم.',
      benchmark: 'للمقارنة، المتوسط العالمي لكلفة إرسال الأموال هو',
      scheduleTitle: 'ما نتقاضاه',
      scheduleNote: 'أي رسوم أخرى سنكتبها هنا، مع تاريخ بدء العمل بها، قبل أن تصلك.',
      item: 'البند',
      fee: 'الرسوم',
    },
    network: {
      label: 'الشبكة',
      title: 'مدن بعيدة، وشاهين *بيوصلها* ببعض.',
      lead:
        'شاهين بيوصّل المصاري من المدينة اللي حدا بيشتغل فيها للبلد اللي أهله عايشين فيه، وموصّل قريب من البيت بيسلّمها كاش.',
      caption: 'أمثلة على مسارات التحويل. اسألنا عن بلدك ومنقلك شو المتاح اليوم.',
      figures: (connectors: string, countries: string, month: string) =>
        `حتى ${month}: ${connectors} موصّل فعّال في ${countries} دولة.`,
      coverageCta: 'اسأل عن بلدك',
      globeLabel: 'كرة أرضية عليها أمثلة لمسارات تحويل الأموال بين المدن',
      merchant: {
        label: 'لأصحاب المحلات',
        title: 'عندك محل؟ صير موصّل.',
        body: 'خلّي أهل حارتك يسحبوا مصاريهم عندك، واكسب من كل عملية بتنفّذها.',
        commission: (pct: string) => `اكسب ${pct} من كل عملية سحب.`,
        cta: 'صير موصّل',
      },
    },
    proof: {
      label: 'بكلماتهم',
      title: 'ناس بتستخدم شاهين موني.',
      ratingsTitle: 'تقييمات متاجر التطبيقات',
      pressTitle: 'في الإعلام',
      securityCta: 'كيف منحمي فلوسك',
    },
    faq: {
      label: 'أسئلة',
      title: 'أكتر إشي *بيسألونا* عنه.',
      stillTitle: 'لسّا بتحتاج مساعدة؟',
      stillCta: 'تواصل معنا',
      items: [
        {
          q: 'شو هو شاهين موني؟',
          a: 'محفظة على الموبايل لاستقبال المصاري من برّا، والاحتفاظ فيها بالدولار الرقمي، والإرسال والدفع، وسحبها كاش من موصّلين قريبين منك.',
        },
        {
          q: 'شو يعني دولار رقمي؟',
          a: 'رصيد محفوظ بالدولار الأمريكي في محفظة شاهين موني، مش بعملتك المحلية، وبيحافظ على قيمته بالدولار لحد ما تستخدمه.',
          link: 'security' as const,
        },
        {
          q: 'كيف بحصّل التطبيق؟',
          a: 'نزّله من App Store أو Google Play عبر الروابط الموجودة بهالموقع، ولا تثبّته إلا منها.',
          link: 'getApp' as const,
        },
        {
          q: 'بأي دول بيشتغل شاهين موني؟',
          a: 'عم نجهّز قائمة موثّقة بالدول. لحد ما تنشر، اسألنا عن بلدك ومنقلك شو المتاح.',
          link: 'contact' as const,
        },
        {
          q: 'كيف بصير موصّل؟',
          a: 'قدّم أونلاين من صفحة الأعمال. فريقنا بيراجع كل طلب وبيتواصل معك على الرقم اللي بتعطينا ياه.',
          link: 'business' as const,
        },
        {
          q: 'صارت مشكلة بتحويل. شو بعمل؟',
          a: 'تواصل معنا واختار «مساعدة في حسابي أو في تحويل»، واذكر الرقم المرجعي للعملية من التطبيق. لا تبعت أبداً كلمة السر أو الرقم السري.',
          link: 'contact' as const,
        },
        {
          q: 'كيف بلّغ عن مشكلة أمنية أو احتيال؟',
          a: 'بصفحة الأمان بتلاقي قنواتنا الرسمية وطريقة الإبلاغ عن ثغرة أو عن حدا منتحل صفتنا.',
          link: 'security' as const,
        },
      ],
    },
    app: {
      collect: {
        title: 'استلم كاشك',
        at: 'عند موصّل قريب منك',
        amount: '$200.00',
        codeLabel: 'ورّي هالرمز',
        code: '482 719',
        note: 'الموصّل بدخّل الرمز، وبعدين بيسلّمك الكاش.',
      },
    },
    final: {
      title: 'فلوسك. *وين ما كنت.*',
      lead: 'استقبل من برّا، ابعت لأي مكان، واسحب كاش قريب منك.',
      steps: ['حمّل التطبيق', 'افتح حسابك', 'استقبل أول حوالة'],
      stepsLabel: 'كيف تبدأ',
    },
  },
});
