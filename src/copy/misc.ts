import { defineCopy } from './define';

export const getApp = defineCopy({
  en: {
    meta: {
      title: 'Get the Shaheen Money app',
      description: 'Download Shaheen Money for iPhone or Android. Only install it from the official store links on shaheen.money.',
    },
    title: 'Get *Shaheen Money*',
    lead: 'Available on iPhone and Android.',
    scan: 'On a computer? Scan this code with your phone. It opens the right store.',
    official: 'Only install Shaheen Money from these links. Anywhere else could be a copy.',
  },
  ar: {
    meta: {
      title: 'حمّل تطبيق شاهين موني',
      description: 'حمّل شاهين موني على آيفون أو أندرويد. ثبّته فقط من روابط المتاجر الرسمية على shaheen.money.',
    },
    title: 'حمّل *شاهين موني*',
    lead: 'متوفر على آيفون وأندرويد.',
    scan: 'على الكمبيوتر؟ امسح الرمز بموبايلك، وبيفتحلك المتجر المناسب.',
    official: 'ثبّت شاهين موني من هالروابط بس. أي مكان تاني ممكن يكون نسخة مزيّفة.',
  },
});

export const accessibility = defineCopy({
  en: {
    meta: {
      title: 'Accessibility — Shaheen Money',
      description: 'How we make shaheen.money usable for everyone, the standard we aim for, and how to tell us about a problem.',
    },
    title: 'Accessibility',
    lead: 'We want everyone to be able to use this website, whatever their device, language or ability.',
    sections: [
      {
        title: 'Our standard',
        body: ['We aim to meet the Web Content Accessibility Guidelines (WCAG) 2.2 at level AA, in English and in Arabic.'],
      },
      {
        title: 'What we do',
        body: [
          'We test every page with automated accessibility checks, in both languages, before it goes live.',
          'Text meets WCAG contrast requirements, and buttons and links are at least 44 pixels in size.',
          'We design for keyboard use, screen readers, 200% zoom and right-to-left reading.',
          'Motion is kept to a minimum and follows your device’s reduced-motion setting.',
        ],
      },
      { title: 'Known issues', body: ['None that we know of right now. If you find one, please tell us.'] },
      { title: 'Tell us', body: ['If something on this website is hard to use, contact us. We read every message.'] },
    ],
    reviewed: 'Last reviewed',
    contactCta: 'Contact us',
  },
  ar: {
    meta: {
      title: 'إمكانية الوصول | شاهين موني',
      description: 'كيف نجعل موقع shaheen.money متاحاً للجميع، والمعيار الذي نسعى إليه، وكيف تخبرنا عن أي مشكلة.',
    },
    title: 'إمكانية الوصول',
    lead: 'نريد أن يتمكّن الجميع من استخدام هذا الموقع، أياً كان جهازهم أو لغتهم أو قدراتهم.',
    sections: [
      {
        title: 'معيارنا',
        body: ['نسعى إلى الالتزام بإرشادات إمكانية الوصول إلى محتوى الويب (WCAG) 2.2 بالمستوى AA، باللغتين العربية والإنجليزية.'],
      },
      {
        title: 'ما نقوم به',
        body: [
          'نختبر كل صفحة بفحوصات آلية لإمكانية الوصول، باللغتين، قبل نشرها.',
          'تستوفي النصوص متطلبات التباين في WCAG، ولا يقل حجم الأزرار والروابط عن 44 بكسل.',
          'نصمّم للاستخدام بلوحة المفاتيح وقارئات الشاشة والتكبير حتى 200% والقراءة من اليمين إلى اليسار.',
          'نُبقي الحركة في حدّها الأدنى، ونحترم إعداد تقليل الحركة في جهازك.',
        ],
      },
      { title: 'مشكلات معروفة', body: ['لا نعرف بوجود مشكلات حالياً. إن وجدت واحدة، يرجى إخبارنا.'] },
      { title: 'أخبرنا', body: ['إذا وجدت صعوبة في استخدام أي جزء من هذا الموقع، تواصل معنا. نقرأ كل رسالة.'] },
    ],
    reviewed: 'آخر مراجعة',
    contactCta: 'تواصل معنا',
  },
});

export const legalPage = defineCopy({
  en: {
    descriptions: {
      privacy: 'How Shaheen Money collects, uses and protects your personal data, and the choices you have.',
      terms: 'The terms that govern your use of the Shaheen Money app and services.',
      cookies: 'How the shaheen.money website uses cookies and similar technologies.',
    },
    pending: 'This document is being updated. For the current version, email',
    version: 'Version',
    effective: 'Effective from',
  },
  ar: {
    descriptions: {
      privacy: 'كيف تجمع شاهين موني بياناتك الشخصية وتستخدمها وتحميها، والخيارات المتاحة لك.',
      terms: 'الشروط التي تحكم استخدامك لتطبيق شاهين موني وخدماته.',
      cookies: 'كيف يستخدم موقع shaheen.money ملفات تعريف الارتباط والتقنيات المشابهة.',
    },
    pending: 'يجري تحديث هذه الوثيقة. للحصول على النسخة السارية، راسلنا على',
    version: 'الإصدار',
    effective: 'نافذة اعتباراً من',
  },
});

export const notFound = {
  en: { title: 'Page not found', body: 'The page you’re looking for doesn’t exist or has moved.', home: 'Go to the homepage' },
  ar: { title: 'الصفحة غير موجودة', body: 'الصفحة التي تبحث عنها غير موجودة أو تم نقلها.', home: 'اذهب إلى الصفحة الرئيسية' },
} as const;
