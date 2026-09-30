import { defineCopy } from './define';

/**
 * The homepage serves two visitors at once, and never makes the first one
 * scroll past anything to leave:
 *
 *  1. the one who came to download: falcon, one slogan, one button that
 *     knows the device, done inside the first screen;
 *  2. the one who wants to understand first: the problem, how it works,
 *     how cash comes out, the network, what it costs, who says so, and the
 *     questions we are asked most, in that order, each answerable without
 *     leaving the page.
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
      availability: 'Available on iPhone and Android',
      explore: 'How it works',
      more: 'Why Shaheen?',
      evidence: {
        countries: (n: string) => `Live in ${n} countries`,
        minCashOut: (amount: string) => `Cash out from ${amount}`,
        connectors: (n: string) => `${n} Connectors`,
        noFxMargin: 'No hidden exchange-rate margin',
      },
    },
    why: {
      label: 'Why Shaheen',
      title: 'Sending money home still costs *too much.*',
      lead:
        'Families who depend on money from abroad lose part of every transfer to fees and exchange-rate markups. Many have no account to receive it into at all.',
      cost: {
        title: 'What sending money across a border costs today',
        target: 'The UN’s 2030 target',
        excess: 'Charged above it',
        total:
          'More than half of what a family pays is cost the world already agreed should not be there. These are global figures, not Shaheen Money’s prices.',
        alt: (actual: string, target: string) =>
          `Bar showing the average global cost of sending money, ${actual}, split into the UN’s 2030 target of ${target} and the amount charged above it.`,
      },
      example:
        'For example, a family in Amman that receives $300 a month loses about $19 of every transfer at the global average cost. That is more than $220 a year.',
    },
    /* was /how-it-works */
    steps: {
      label: 'How it works',
      title: 'From a transfer abroad to cash in *your hand.*',
      lead: 'Four steps, and you choose where to stop.',
      items: [
        {
          title: 'Receive',
          body: 'Money can come from family, a client, an employer or another compatible wallet. When it arrives, it shows in your balance.',
        },
        {
          title: 'Hold in dollars',
          body: 'Your balance is held in digital dollars: a balance in US dollars, not in your local currency. You decide when to use it.',
        },
        { title: 'Send and pay', body: 'Send part of your balance to someone else, or pay directly from the app.' },
        {
          title: 'Cash out',
          body: 'When you need physical cash, ask for it in the app and collect it from a Connector: a local business in the Shaheen network.',
        },
      ],
      goodToKnow: 'Good to know',
      facts: [
        {
          title: 'Your balance is in US dollars',
          body: 'Not in your local currency, so it keeps its dollar value until you use it.',
        },
        {
          title: 'Cash comes from people',
          body: 'Connectors are local shops, not machines. You collect your money from someone in your area.',
        },
        {
          title: 'Fees are published',
          body: 'Every fee is written down, with the date it applies from. Nothing is added at the counter.',
        },
      ],
      audiencesTitle: 'Who it’s for',
      audiences: [
        { title: 'Families', body: 'Your son sends money from Berlin. You collect it as cash down the street.' },
        { title: 'Freelancers', body: 'A client in Europe pays your invoice. You keep it in dollars until you need it.' },
        { title: 'People abroad', body: 'You send support home. Your parents collect it where and when it suits them.' },
        { title: 'Shop owners', body: 'Your shop becomes a Connector and earns on every cash-out it hands over.' },
      ],
    },
    /* was /cash-out */
    cashOut: {
      label: 'Cash out',
      title: 'Your money leaves the app at a shop you *already know.*',
      lead:
        'Connectors are local businesses in the Shaheen network. They hand over cash to Shaheen Money users, so a digital balance becomes money in your hand.',
      steps: [
        { title: 'Ask for cash in the app', body: 'Choose how much you want to take out.' },
        { title: 'Visit a Connector', body: 'Go to a Connector near you.' },
        { title: 'Collect your cash', body: 'Count it before you leave.' },
      ],
      minimum: (amount: string) => `The smallest cash-out is ${amount}.`,
      safetyTitle: 'Stay safe',
      safety: [
        'Count your cash before you leave the shop.',
        'Never share your password or PIN with anyone, including someone who says they work for Shaheen Money.',
        'Keep your phone locked with a PIN or biometrics.',
      ],
    },
    network: {
      label: 'The network',
      title: 'Cities apart. *Connected* by Shaheen.',
      lead:
        'Between the city where someone earns and the town where their family lives, Shaheen carries the money across the border. A Connector near home hands it over as cash.',
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
    /* was /pricing */
    pricing: {
      label: 'What it costs',
      title: 'See the full cost *before* you send.',
      lead: 'The cost of a transfer is more than the fee on the screen. It has three parts.',
      parts: [
        { title: 'The fee', body: 'What the provider charges upfront. The easy part to see.' },
        {
          title: 'The exchange-rate margin',
          body: 'The gap between the rate you get and the mid-market rate. Often the largest cost, and the least visible.',
        },
        { title: 'The cash-out cost', body: 'What it costs the person receiving to turn the money into cash.' },
      ],
      exampleTitle: 'Do the arithmetic',
      example:
        'Sending $300 with a $5 fee and an exchange rate 2% below the mid-market rate costs $5 + $6 = $11. That is 3.7% of what you sent.',
      exampleNote: 'An illustration of the arithmetic, not our prices.',
      /* The worked example as a small calculator (same numbers by default). */
      calc: {
        label: 'Try it with your numbers',
        amount: 'You send',
        fee: 'Upfront fee',
        margin: 'Rate margin',
        feePart: 'Fee',
        marginPart: 'Margin',
        total: 'Total cost',
        share: 'of what you sent',
      },
      benchmark: 'For reference, the global average cost of sending money is',
      scheduleTitle: 'What we charge',
      /* The list is three lines long and every line says nothing. Without
         this sentence a reader could take it for the whole schedule; with
         it, the page promises where the rest will appear. */
      scheduleNote:
        'Any other charge will be listed here, with the date it applies from, before it reaches you.',
      item: 'Item',
      fee: 'Fee',
      caption: (amount: string, corridor: string) => `Sending ${amount}: ${corridor}`,
      provider: 'Provider',
      fxMargin: 'Exchange-rate margin',
      totalCost: 'Total cost',
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
      stillBody: 'Tell us what happened and we’ll get back to you.',
      stillCta: 'Contact us',
      filterLabel: 'Filter the questions',
      filterEmpty: 'No question matches that. Try another word, or contact us.',
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
    blog: {
      label: 'From the blog',
      title: 'Thinking about access, trust and *money.*',
      all: 'All posts',
    },
    /**
     * Labels on the app, drawn in code (components/app). The screens follow
     * the real app (the owner's screenshots, 30 Sep 2026): Cash Balance, the
     * USDc selector, Add Funds · Withdraw · Send · Request, and the
     * Marketplace · Home · History bar. Every figure is an example and every
     * screen carries the "Illustrative" stamp: they show what the app does,
     * never what anyone holds. The amounts are one story told across the
     * page: 940.00, then +300.00 from abroad makes 1,240.00; sending and
     * paying take it to 1,176.50; a 200.00 cash-out leaves 976.50.
     */
    app: {
      balanceLabel: 'Cash Balance',
      currency: 'USDc',
      balanceBefore: '940.00',
      balance: '1,240.00',
      balanceAfterSpend: '1,176.50',
      balanceAfterCash: '976.50',
      actions: { add: 'Add Funds', withdraw: 'Withdraw', send: 'Send', request: 'Request', swap: 'Swap' },
      tabs: ['Marketplace', 'Home', 'History'],
      historyTitle: 'History',
      rows: [
        { label: 'Received', meta: 'From abroad', amount: '+300.00', kind: 'in' },
        { label: 'Sent', meta: 'To another wallet', amount: '−45.00', kind: 'out' },
        { label: 'Paid', meta: 'From your balance', amount: '−18.50', kind: 'out' },
        { label: 'Cash out', meta: 'At a Connector', amount: '−200.00', kind: 'cash' },
      ],
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
      coverage: 'Talk to us',
      connector: 'Run a shop? Become a Connector',
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
      availability: 'متوفر على آيفون وأندرويد',
      explore: 'كيف بيشتغل',
      more: 'ليش شاهين؟',
      evidence: {
        countries: (n: string) => `متوفر في ${n} دولة`,
        minCashOut: (amount: string) => `سحب كاش ابتداءً من ${amount}`,
        connectors: (n: string) => `${n} موصّل`,
        noFxMargin: 'بدون هامش مخفي على سعر الصرف',
      },
    },
    why: {
      label: 'ليش شاهين',
      title: 'لسّا إرسال المصاري للأهل *مكلف كتير.*',
      lead:
        'العائلات اللي بتعتمد على مصاري من برّا بتخسر جزء من كل حوالة على الرسوم وفروقات سعر الصرف، وكتير منهم ما عندهم حساب يستقبلوا عليه أصلاً.',
      cost: {
        title: 'قديش بتكلّف اليوم حوالة عبر الحدود',
        target: 'هدف الأمم المتحدة لعام 2030',
        excess: 'المبلغ المأخوذ فوقه',
        total:
          'أكتر من نص اللي بتدفعه العائلة هو كلفة العالم كله متفق إنها ما لازم تكون. هاي أرقام عالمية، مش أسعار شاهين موني.',
        alt: (actual: string, target: string) =>
          `رسم بياني بيوضّح المتوسط العالمي لكلفة إرسال الأموال، ${actual}، مقسوم إلى هدف الأمم المتحدة لعام 2030 وهو ${target}، والمبلغ المأخوذ فوقه.`,
      },
      example:
        'مثلاً، عائلة في عمّان بتستقبل 300 دولار بالشهر بتخسر حوالي 19 دولار من كل حوالة حسب المتوسط العالمي للكلفة. يعني أكثر من 220 دولار بالسنة.',
    },
    steps: {
      label: 'كيف بيشتغل',
      title: 'من حوالة بالخارج لكاش *بإيدك.*',
      lead: 'أربع خطوات، وإنت بتقرر وين بدك توقف.',
      items: [
        {
          title: 'استقبل',
          body: 'بتوصلك المصاري من أهلك أو عميل أو شغلك برّا، أو من محفظة متوافقة، وبتظهر برصيدك أول ما توصل.',
        },
        {
          title: 'احتفظ بالدولار',
          body: 'رصيدك محفوظ بالدولار الرقمي، يعني رصيد بالدولار الأمريكي مش بعملتك المحلية. وإنت بتقرر إمتى تستخدمه.',
        },
        { title: 'ابعت وادفع', body: 'ابعت جزء من رصيدك لحدا تاني، أو ادفع مباشرة من التطبيق.' },
        {
          title: 'اسحب كاش',
          body: 'لما تحتاج كاش، اطلبه من التطبيق واستلمه من موصّل: محل قريب منك ضمن شبكة شاهين.',
        },
      ],
      goodToKnow: 'حلو تعرف',
      facts: [
        {
          title: 'رصيدك بالدولار الأمريكي',
          body: 'مش بعملتك المحلية، فبيحافظ على قيمته بالدولار لحد ما تستخدمه.',
        },
        {
          title: 'الكاش بيجي من ناس',
          body: 'الموصّلون محلات من الحي، مش أجهزة صراف. بتستلم مصاريك من حدا بمنطقتك.',
        },
        {
          title: 'الرسوم منشورة',
          body: 'كل رسم مكتوب، ومعه تاريخ بدء العمل فيه. ما في إشي بينضاف عند الشبّاك.',
        },
      ],
      audiencesTitle: 'لمين شاهين؟',
      audiences: [
        { title: 'العائلات', body: 'ابنك بيبعتلك من برلين، وإنت بتسحبها كاش بآخر الشارع.' },
        { title: 'المستقلون', body: 'عميلك في أوروبا بيدفعلك الفاتورة، وإنت بتحتفظ فيها بالدولار لحد ما تحتاجها.' },
        { title: 'المغتربون', body: 'بتبعت لأهلك، وهنّي بيسحبوها وين ووقت ما بيناسبهم.' },
        { title: 'أصحاب المحلات', body: 'محلّك بيصير موصّل، وبتكسب من كل عملية سحب بتسلّمها.' },
      ],
    },
    cashOut: {
      label: 'السحب النقدي',
      title: 'مصاريك بتطلع من التطبيق عند محل *بتعرفه.*',
      lead:
        'الموصّلون محلات من الحي ضمن شبكة شاهين، بيسلّموا الكاش لمستخدمي شاهين موني. هيك الرصيد الرقمي بيصير مصاري بإيدك.',
      steps: [
        { title: 'اطلب كاش من التطبيق', body: 'اختار قديش بدك تسحب.' },
        { title: 'روح لموصّل', body: 'روح لموصّل قريب منك.' },
        { title: 'استلم مصاريك', body: 'عدّها قبل ما تطلع.' },
      ],
      minimum: (amount: string) => `أقل مبلغ للسحب هو ${amount}.`,
      safetyTitle: 'خليك بأمان',
      safety: [
        'عدّ مصاريك قبل ما تطلع من المحل.',
        'لا تعطي كلمة السر أو الرقم السري لأي حدا، حتى لو قال إنه من شاهين موني.',
        'خلّي موبايلك مقفول برقم سري أو ببصمة.',
      ],
    },
    network: {
      label: 'الشبكة',
      title: 'مدن بعيدة، وشاهين *بيوصلها* ببعض.',
      lead:
        'بين المدينة اللي حدا بيشتغل فيها والبلد اللي أهله عايشين فيه، شاهين بيوصّل المصاري عبر الحدود، وموصّل قريب من البيت بيسلّمها كاش.',
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
    pricing: {
      label: 'الكلفة',
      title: 'اعرف الكلفة الكاملة *قبل* ما تبعت.',
      lead: 'كلفة التحويل أكتر من الرقم اللي بتشوفه على الشاشة، وإلها ثلاث أجزاء.',
      parts: [
        { title: 'الرسوم', body: 'اللي بياخده مقدّم الخدمة مباشرة، وهو الجزء الأسهل ما تشوفه.' },
        {
          title: 'هامش سعر الصرف',
          body: 'الفرق بين السعر اللي بتاخده وسعر السوق الوسطي. غالباً هو أكبر كلفة وأقلها وضوح.',
        },
        { title: 'كلفة السحب', body: 'اللي بيدفعه المستلم لما يحوّل المبلغ لكاش.' },
      ],
      exampleTitle: 'اعمل الحسبة',
      example:
        'إرسال 300 دولار برسوم 5 دولارات وسعر صرف أقل من سعر السوق الوسطي بنسبة 2% بيكلّف 5 + 6 = 11 دولار، يعني 3.7% من المبلغ اللي بعتّه.',
      exampleNote: 'توضيح للحسبة بس، مش أسعارنا.',
      calc: {
        label: 'جرّبها بأرقامك',
        amount: 'المبلغ اللي بتبعته',
        fee: 'الرسوم المقدّمة',
        margin: 'هامش سعر الصرف',
        feePart: 'الرسوم',
        marginPart: 'الهامش',
        total: 'الكلفة الإجمالية',
        share: 'من المبلغ اللي بعتّه',
      },
      benchmark: 'للمقارنة، المتوسط العالمي لكلفة إرسال الأموال هو',
      scheduleTitle: 'شو بناخذ',
      scheduleNote:
        'أي رسوم ثانية رح نكتبها هون، مع تاريخ بداية العمل فيها، قبل ما توصلك.',
      item: 'البند',
      fee: 'الرسوم',
      caption: (amount: string, corridor: string) => `إرسال ${amount}: ${corridor}`,
      provider: 'مقدّم الخدمة',
      fxMargin: 'هامش سعر الصرف',
      totalCost: 'الكلفة الإجمالية',
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
      stillBody: 'احكيلنا شو صار ومنرجعلك.',
      stillCta: 'تواصل معنا',
      filterLabel: 'ابحث في الأسئلة',
      filterEmpty: 'ما في سؤال بيطابق هالكلمة. جرّب كلمة ثانية، أو تواصل معنا.',
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
    blog: {
      label: 'من المدونة',
      title: 'أفكار عن الوصول والثقة *والمال.*',
      all: 'كل المقالات',
    },
    app: {
      balanceLabel: 'الرصيد النقدي',
      currency: 'USDc',
      balanceBefore: '940.00',
      balance: '1,240.00',
      balanceAfterSpend: '1,176.50',
      balanceAfterCash: '976.50',
      actions: { add: 'إضافة رصيد', withdraw: 'سحب', send: 'إرسال', request: 'طلب', swap: 'تبديل' },
      tabs: ['السوق', 'الرئيسية', 'السجل'],
      historyTitle: 'السجل',
      rows: [
        { label: 'استلمت', meta: 'من برّا', amount: '+300.00', kind: 'in' },
        { label: 'بعثت', meta: 'لمحفظة ثانية', amount: '−45.00', kind: 'out' },
        { label: 'دفعت', meta: 'من رصيدك', amount: '−18.50', kind: 'out' },
        { label: 'سحب كاش', meta: 'عند موصّل', amount: '−200.00', kind: 'cash' },
      ],
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
      coverage: 'احكي معنا',
      connector: 'عندك محل؟ صير موصّل',
    },
  },
});
