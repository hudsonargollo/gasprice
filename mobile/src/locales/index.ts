import { ptBR } from './pt-BR';

export type TranslationKeys = typeof ptBR;

export const translations = {
  'pt-BR': ptBR,
};

export const defaultLanguage = 'pt-BR';

// Hook para usar traduções
export const useTranslation = () => {
  const t = (key: string): string => {
    const keys = key.split('.');
    let value: any = translations[defaultLanguage];
    
    for (const k of keys) {
      value = value?.[k];
    }
    
    return value || key;
  };

  return { t };
};