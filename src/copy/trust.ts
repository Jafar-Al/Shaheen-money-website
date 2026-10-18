import { defineCopy } from './define';

export const security = defineCopy({
  en: {
    meta: {
      title: 'Security: how Shaheen Money protects your money and data',
      description:
        'Licensing, how customer funds are held, what a digital dollar is, how to spot scams, and how to report a security issue.',
    },
    title: 'How we protect your *money* and your data',
    lead: 'What we can tell you today, what to watch out for, and how to reach us about anything suspicious.',
    licensing: 'Licensing and regulation',
    funds: 'How customer funds are held',
    digitalDollar: 'What a digital dollar is',
    register: 'Check the public register',
    accountTitle: 'Protecting your account',
    account: [
      'Keep your phone locked with a PIN or biometrics.',
      'Never share your password or PIN with anyone, including someone who says they work for Shaheen Money.',
      'Only install the app from the App Store and Google Play links on shaheen.money.',
      'Our website is shaheen.money. Check the address before you sign in or download anything.',
    ],
    channelsTitle: 'Our official channels',
    channelsBody: 'If a message claims to be from Shaheen Money, check that it came from one of these.',
    scamTitle: 'Seen something suspicious?',
    scamBody:
      'If someone contacts you pretending to be Shaheen Money, do not reply and do not send money. Tell us through the contact page.',
    scamCta: 'Contact us',
    reportTitle: 'Report a security issue',
    reportBody: (email: string) =>
      `If you think you have found a vulnerability in our website or app, email ${email}. Our disclosure details are in security.txt.`,
    reportCta: 'Read security.txt',
    siteTitle: 'This website',
    site: [
      'Served only over HTTPS, with a strict Content Security Policy on every page.',
      'No advertising trackers and no cookies.',
      'Forms are checked on our server and rate-limited. Nothing you type is stored in your browser.',
    ],
  },
  ar: {
    meta: {
      title: 'الأمان: كيف تحمي شاهين موني أموالك وبياناتك',
      description:
        'الترخيص، وكيفية حفظ أموال العملاء، وما هو الدولار الرقمي، وكيف تكتشف الاحتيال، وكيف تبلّغ عن مشكلة أمنية.',
    },
    title: 'كيف نحمي *أموالك* وبياناتك',
    lead: 'ما يمكننا إخبارك به اليوم، وما يجب الانتباه إليه، وكيف تتواصل معنا بشأن أي أمر مريب.',
    licensing: 'الترخيص والتنظيم',
    funds: 'كيف تُحفظ أموال العملاء',
    digitalDollar: 'ما هو الدولار الرقمي',
    register: 'تحقّق من السجل العام',
    accountTitle: 'حماية حسابك',
    account: [
      'اقفل هاتفك برقم سري أو بالبصمة.',
      'لا تشارك كلمة المرور أو الرقم السري مع أي شخص، حتى لو ادّعى أنه يعمل لدى شاهين موني.',
      'ثبّت التطبيق فقط من روابط App Store وGoogle Play الموجودة على shaheen.money.',
      'موقعنا هو shaheen.money. تحقّق من العنوان قبل تسجيل الدخول أو تنزيل أي شيء.',
    ],
    channelsTitle: 'قنواتنا الرسمية',
    channelsBody: 'إذا وصلتك رسالة تدّعي أنها من شاهين موني، تأكّد أنها جاءت من إحدى هذه القنوات.',
    scamTitle: 'لاحظت شيئاً مريباً؟',
    scamBody: 'إذا تواصل معك شخص ينتحل صفة شاهين موني، لا تردّ ولا ترسل أي مال. أخبرنا عبر صفحة التواصل.',
    scamCta: 'تواصل معنا',
    reportTitle: 'الإبلاغ عن مشكلة أمنية',
    reportBody: (email: string) =>
      `إذا اعتقدت أنك وجدت ثغرة في موقعنا أو تطبيقنا، راسلنا على ${email}. تفاصيل الإفصاح موجودة في ملف security.txt.`,
    reportCta: 'اقرأ ملف security.txt',
    siteTitle: 'هذا الموقع',
    site: [
      'يُقدَّم عبر HTTPS فقط، مع سياسة أمان محتوى (CSP) صارمة في كل صفحة.',
      'لا يستخدم أدوات تتبّع إعلانية ولا ملفات تعريف ارتباط.',
      'تُفحص النماذج على خوادمنا مع حدّ لعدد المحاولات، ولا يُحفظ شيء مما تكتبه في متصفحك.',
    ],
  },
});

export const about = defineCopy({
  en: {
    meta: {
      title: 'About Shaheen Money',
      description:
        'From Bankey to Empowch to Shaheen Money: building an open financial network that connects North America, Europe and the Middle East.',
    },
    title: 'Access to money shouldn’t depend on *where you were born.*',
    lead:
      'Shaheen Money is building an open financial network that connects North America, Europe and the Middle East, so people can receive, hold, send and cash out money wherever they are.',
    storyTitle: 'How we got here',
    chapters: [
      { name: 'Bankey', body: 'Our first venture, built to make everyday banking simpler through a digital-first experience.' },
      {
        name: 'Empowch',
        body: 'A company founded on inclusion: giving people and communities the tools to take part in the global economy.',
      },
      {
        name: 'Shaheen Money',
        body: 'As stablecoins and open payment networks matured, we set out to turn them into something people can use every day.',
      },
    ],
    missionTitle: 'What we are building',
    mission: [
      'An open financial ecosystem where people, businesses, banks, digital wallets, payment providers and cash networks work together instead of past each other.',
      'Our ambition is not to replace existing financial institutions. It is to connect them, so that moving money across a border is as ordinary as sending a message.',
      'That means payment corridors between North America, Europe and the Middle East, built on regulated partners and open payment rails, and ending at a shop where somebody can be handed cash.',
    ],
    principlesTitle: 'What we hold to',
    principles: [
      { title: 'People before technology', body: 'Technology is only worth it if it makes someone’s day easier.' },
      { title: 'Access before exclusivity', body: 'A good service is one people can actually reach.' },
      {
        title: 'Interoperability before isolation',
        body: 'We connect to banks, wallets and payment networks instead of walling people in.',
      },
      { title: 'Empowerment before dependency', body: 'Your money stays yours, to use when and where you choose.' },
      { title: 'Trust through transparency', body: 'Trust is earned by showing how things work and what they cost.' },
    ],
    quote:
      'I founded Shaheen Money because I believe where someone is born should never determine the opportunities available to them. Our mission is to build financial infrastructure that connects people, communities and economies, not just accounts and transactions.',
    leadershipTitle: 'Leadership',
    companyTitle: 'Company details',
    profileCta: 'Company profile (PDF)',
    blogCta: 'Read our blog',
    contactCta: 'Contact us',
    businessCta: 'Work with us',
  },
  ar: {
    meta: {
      title: 'من نحن | شاهين موني',
      description: 'من Bankey إلى Empowch إلى شاهين موني: نبني شبكة مالية مفتوحة تربط أمريكا الشمالية وأوروبا والشرق الأوسط.',
    },
    title: 'لا ينبغي أن يتحدّد وصولك إلى المال *بمكان ولادتك.*',
    lead:
      'تبني شاهين موني شبكة مالية مفتوحة تربط أمريكا الشمالية وأوروبا والشرق الأوسط، ليتمكّن الناس من استقبال أموالهم والاحتفاظ بها وإرسالها وسحبها نقداً أينما كانوا.',
    storyTitle: 'كيف وصلنا إلى هنا',
    chapters: [
      { name: 'Bankey', body: 'مشروعنا الأول، هدفه تبسيط الخدمات المصرفية اليومية عبر تجربة رقمية أولاً.' },
      { name: 'Empowch', body: 'شركة قامت على الشمول المالي: تزويد الأفراد والمجتمعات بالأدوات التي تمكّنهم من المشاركة في الاقتصاد العالمي.' },
      { name: 'شاهين موني', body: 'مع نضوج العملات المستقرة وشبكات الدفع المفتوحة، انطلقنا لنحوّلها إلى شيء يستخدمه الناس كل يوم.' },
    ],
    missionTitle: 'ما الذي نبنيه',
    mission: [
      'منظومة مالية مفتوحة يعمل فيها الأفراد والشركات والبنوك والمحافظ الرقمية ومزوّدو الدفع وشبكات النقد معاً، بدل أن يعمل كل طرف بمعزل عن الآخر.',
      'طموحنا ليس أن نحلّ محلّ المؤسسات المالية القائمة، بل أن نربط بينها، ليصبح انتقال المال عبر الحدود أمراً عادياً كإرسال رسالة.',
      'وهذا يعني مسارات دفع تربط أمريكا الشمالية وأوروبا والشرق الأوسط، مبنية على شركاء مرخّصين وأنظمة دفع مفتوحة، وتنتهي عند محل يستلم منه أحدهم مالاً نقدياً.',
    ],
    principlesTitle: 'ما نلتزم به',
    principles: [
      { title: 'الإنسان قبل التقنية', body: 'لا قيمة للتقنية إن لم تجعل يوم أحدهم أسهل.' },
      { title: 'الوصول قبل الحصرية', body: 'الخدمة الجيدة هي التي يستطيع الناس الوصول إليها فعلاً.' },
      { title: 'الترابط قبل العزلة', body: 'نتصل بالبنوك والمحافظ وشبكات الدفع بدلاً من حبس الناس داخل نظام مغلق.' },
      { title: 'التمكين قبل التبعية', body: 'أموالك تبقى ملكك، تستخدمها متى وأين تشاء.' },
      { title: 'الثقة عبر الشفافية', body: 'تُكسب الثقة بشرح طريقة عمل الأشياء وكم تكلّف.' },
    ],
    quote:
      'أسّست شاهين موني لأنني أؤمن بأن مكان ولادة الإنسان يجب ألّا يحدّد الفرص المتاحة له. رسالتنا أن نبني بنية مالية تربط الناس والمجتمعات والاقتصادات، لا مجرد حسابات ومعاملات.',
    leadershipTitle: 'القيادة',
    companyTitle: 'بيانات الشركة',
    profileCta: 'الملف التعريفي للشركة (PDF)',
    blogCta: 'اقرأ مدونتنا',
    contactCta: 'تواصل معنا',
    businessCta: 'اشتغل معنا',
  },
});
