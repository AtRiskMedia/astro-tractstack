// Brand Colors --> POSITIONAL MAPPING SYSTEM:
// Position 1: Very dark (primary black) - pairs with 2,8 for text contrast
// Position 2: Very light (primary white) - pairs with 1,5,7 for background contrast
// Position 3: Bright foreground/background color (accent)
// Position 4: Bright foreground/background color (secondary accent)
// Position 5: Darker background color - pairs with 2,6,8 for content areas
// Position 6: Middle color - general purpose, pairs with 1,5 for subtle contrast
// Position 7: Dark utility color
// Position 8: Off-white - pairs with 1,5,7 for softer contrast than position 2

export const PUBLIC_THEME = 'light-bold';

export const THEME_OPTIONS = [
  'Default',
  'Monet',
  'Dali',
  'Hiphop',
  'Grey',
  'Custom',
] as const;

export type ThemeOption = (typeof THEME_OPTIONS)[number];

// Theme presets with exactly 8 brand colors each - using YOUR actual selections
export const THEME_PRESETS: Record<string, string[]> = {
  Default: [
    '10120d',
    'fcfcfc',
    'f58333',
    'c8df8c',
    '293f58',
    'a7b1b7',
    '393d34',
    'e3e3e3',
  ],
  Monet: [
    '0f1912',
    'f6f4f3',
    'cfae97',
    'ded2c3',
    '24423c',
    'a8cd20',
    '452a3d',
    'f3f5f6',
  ],
  Dali: [
    '150c02',
    'fffef9',
    'fef6d1',
    'e2e5d4',
    '4b3703',
    'dddcca',
    '382c0d',
    'fefcee',
  ],
  Hiphop: [
    '0d0d09',
    'faf7f3',
    'ffd201',
    'a3bfd4',
    '39304d',
    'f6e5ce',
    '3c2a25',
    'f0e7d5',
  ],
  Grey: [
    '101010',
    'f0f0f0',
    '888888',
    'aaaaaa',
    '333333',
    'bbbbbb',
    '444444',
    'dddddd',
  ],
};

// Validate that all presets have exactly 8 colors
Object.entries(THEME_PRESETS).forEach(([themeName, colors]) => {
  if (colors.length !== 8) {
    throw new Error(
      `Theme "${themeName}" must have exactly 8 colors, found ${colors.length}`
    );
  }
});

// Helper function to get theme colors
export function getThemeColors(theme: string): string[] {
  return THEME_PRESETS[theme] || THEME_PRESETS.Default;
}

// Helper function to check if theme is custom
export function isCustomTheme(theme: string): boolean {
  return theme === 'Custom' || !THEME_OPTIONS.includes(theme as ThemeOption);
}
