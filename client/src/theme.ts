export type Theme = 'default' | 'light' | 'contrast';

export const THEME_STORAGE_KEY = 'linguafire-theme';

export const themeOptions: Array<{
  id: Theme;
  label: string;
  description: string;
}> = [
  {
    id: 'default',
    label: 'Fogo',
    description: 'Escuro com laranja'
  },
  {
    id: 'light',
    label: 'Claro',
    description: 'Mais leve para o dia'
  },
  {
    id: 'contrast',
    label: 'Neon',
    description: 'Mais contraste'
  }
];

export function normalizeTheme(theme?: string | null): Theme {
  return theme === 'light' || theme === 'contrast' ? theme : 'default';
}

export function getStoredTheme(): Theme {
  return normalizeTheme(localStorage.getItem(THEME_STORAGE_KEY));
}

export function applyTheme(theme?: string | null) {
  const nextTheme = normalizeTheme(theme);
  document.body.dataset.theme = nextTheme;
  localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
  return nextTheme;
}
