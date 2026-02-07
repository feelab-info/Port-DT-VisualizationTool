import { useLanguage } from '@/context/LanguageContext';
import { translations } from '@/translations/translations';

export function useTranslation() {
  const { language } = useLanguage();
  return translations[language];
}
