import type { HabitFrequencyValue } from '@purposemint/contracts';

export const VALUE_COLOR_TOKENS: Record<string, string> = {
  pink: '#C20A72',
  blue: '#2563EB',
  green: '#16A34A',
  orange: '#EA580C',
  purple: '#7C3AED',
  sky: '#0284C7',
  gold: '#CA8A04',
  teal: '#0D9488',
  red: '#DC2626',
};

export function colorForToken(token: string): string {
  return VALUE_COLOR_TOKENS[token] ?? '#C20A72';
}

export function frequencyLabel(frequency: HabitFrequencyValue): string {
  if (frequency === 'daily') return 'Daily';
  if (frequency === 'weekly') return 'Weekly';
  return 'As-Needed';
}
