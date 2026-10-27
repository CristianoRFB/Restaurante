import type { FoodDemoBranding } from '@/shared/food-platform-domain';

export const defaultDemoBrandColors = {
  backgroundColor: '#FFFFFF',
  accentColor: '#F3E5CD',
} as const;
const isHex = (value: string) => /^#[0-9a-fA-F]{6}$/.test(value);

export function validatedDemoBranding(raw: FoodDemoBranding): Required<FoodDemoBranding> {
  const name = raw.name?.trim() ?? '';
  const tagline = raw.tagline?.trim() ?? '';
  const primaryColor = raw.primaryColor?.trim().toUpperCase() ?? '';
  const backgroundColor = (raw.backgroundColor ?? defaultDemoBrandColors.backgroundColor).trim().toUpperCase();
  const accentColor = (raw.accentColor ?? defaultDemoBrandColors.accentColor).trim().toUpperCase();
  const fontPreset = raw.fontPreset ?? 'system';
  if (name.length < 3 || name.length > 120 || tagline.length > 240 ||
      ![primaryColor, backgroundColor, accentColor].every(isHex) ||
      !['system','serif','rounded'].includes(fontPreset)) {
    throw new Error('Identidade inválida. Revise texto, cores e tipografia.');
  }
  return { name, tagline, primaryColor, backgroundColor, accentColor, fontPreset };
}
