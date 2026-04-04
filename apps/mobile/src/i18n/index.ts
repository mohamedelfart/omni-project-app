import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      auth: {
        welcome: 'Welcome back to QuickRent',
        subtitle: 'Secure global rental and lifestyle platform',
        email: 'Email',
        password: 'Password',
        signIn: 'Sign In',
      },
      home: {
        greeting: 'Good evening',
        searchPlaceholder: 'Search by city, area, landmark, or property ID',
        actions: {
          propertySearch: 'Property Search',
          services: 'Services',
          payments: 'Payments',
          rewards: 'Rewards',
        },
      },
    },
  },
  ar: {
    translation: {
      auth: {
        welcome: 'مرحبا بعودتك إلى كويك رينت',
        subtitle: 'منصة عالمية آمنة للإيجار ونمط الحياة',
        email: 'البريد الإلكتروني',
        password: 'كلمة المرور',
        signIn: 'تسجيل الدخول',
      },
      home: {
        greeting: 'مساء الخير',
        searchPlaceholder: 'ابحث بالمدينة أو المنطقة أو المعلم أو رقم العقار',
        actions: {
          propertySearch: 'بحث عن عقار',
          services: 'الخدمات',
          payments: 'المدفوعات',
          rewards: 'المكافآت',
        },
      },
    },
  },
};

void i18n.use(initReactI18next).init({
  resources,
  lng: 'en',
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
