import { defineCopy } from './define';

/**
 * The labels of the two downloadable documents (the company profile and the
 * pitch deck, src/pages/[locale]/media/). Everything else in them is the
 * site's own copy and sourced facts, so the PDFs and the pages never say
 * different things.
 */
export const docs = defineCopy({
  en: {
    profile: {
      title: 'Company profile',
      description: 'Shaheen Money: who we are, what the app does, what it costs, and how to reach us.',
    },
    deck: {
      title: 'Pitch deck',
      description: 'Shaheen Money in eleven slides: the problem, the app, the Connector network, pricing, trust and the team.',
    },
    edition: 'October 2026',
    company: 'Bankey LLC, doing business as Shaheen Money',
    whoWeAre: 'Who we are',
    product: 'The product',
    whyItMatters: 'Why it matters',
    people: 'People and principles',
    problem: 'The problem',
    answer: 'Our answer',
    app: 'The app',
    appActions: ['Add funds', 'Withdraw', 'Send', 'Request'],
    appLead: 'One balance in digital dollars, four actions, on iPhone and Android.',
    connectors: 'Connectors',
    pricing: 'Pricing',
    trust: 'Trust',
    team: 'Team',
    contact: 'Contact',
    reach: 'Reach us',
    page: 'Page',
  },
  ar: {
    profile: {
      title: 'الملف التعريفي للشركة',
      description: 'شاهين موني: من نحن، وماذا يفعل التطبيق، وكم يكلّف، وكيف تتواصل معنا.',
    },
    deck: {
      title: 'العرض التقديمي',
      description: 'شاهين موني في إحدى عشرة شريحة: المشكلة، والتطبيق، وشبكة الموصّلين، والأسعار، والثقة، والفريق.',
    },
    edition: 'تشرين الأول 2026',
    company: 'Bankey LLC، وتعمل باسم شاهين موني',
    whoWeAre: 'من نحن',
    product: 'المنتج',
    whyItMatters: 'لماذا يهمّ هذا',
    people: 'الفريق والمبادئ',
    problem: 'المشكلة',
    answer: 'حلّنا',
    app: 'التطبيق',
    appActions: ['إيداع', 'سحب', 'إرسال', 'طلب'],
    appLead: 'رصيد واحد بالدولار الرقمي، وأربع عمليات، على آيفون وأندرويد.',
    connectors: 'الموصّلون',
    pricing: 'الأسعار',
    trust: 'الثقة',
    team: 'الفريق',
    contact: 'التواصل',
    reach: 'تواصل معنا',
    page: 'صفحة',
  },
});
