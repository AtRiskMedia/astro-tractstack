import tinycolor from 'tinycolor2';
import colorConfig from '@/constants/tailwindColors.json';
import type { Theme } from '@/types/tractstack';
import type { ClosestColor, RGB } from '@/types/compositorTypes';
import { PUBLIC_THEME } from '@/constants/brandThemes';

export type TailwindColor = (typeof colorValues)[number];
export type ThemeColorMap = { [key in Theme]: TailwindColor };

type TailwindColorPalette = {
  [colorName: string]: string[];
};

function getBrandColours(brand: string | null): string[] {
  const defaultColors = colorConfig.defaultColors;
  if (brand && typeof brand === 'string') {
    const hexColorRegex = /^([A-Fa-f0-9]{6}(?:,[A-Fa-f0-9]{6})*)$/;
    if (hexColorRegex.test(brand)) {
      return brand.split(',');
    } else {
      console.error(
        'Does not match the expected format of hexadecimal colors separated by commas.'
      );
    }
  }
  return defaultColors;
}

export const getComputedColor = (color: string): string => {
  if (color === `#` || typeof color === `undefined`) return `#ffffff`;
  if (color.startsWith('#var(--')) {
    color = color.slice(1);
  }
  if (color.startsWith('var(--')) {
    const varName = color.slice(4, -1);
    const computedStyle = getComputedStyle(document.documentElement);
    return computedStyle.getPropertyValue(varName).trim() || color;
  }
  return color;
};

export function getBrandColor(
  colorVar: string,
  brand: string | null
): string | null {
  const brandColours = getBrandColours(brand);
  const colorName = colorVar.replace('var(--brand-', '').replace(')', '');
  const index = parseInt(colorName) - 1;
  return index >= 0 && index < brandColours.length ? brandColours[index] : null;
}

export const COLOR_STYLES = colorConfig.colorStyles;
export type ColorStyle = (typeof COLOR_STYLES)[number];

export const customColors = colorConfig.customColors;
export const tailwindColors: TailwindColorPalette = colorConfig.tailwindColors;

export const getTailwindColorOptions = () => {
  const shades = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
  const standardColors = Object.entries(tailwindColors).flatMap(
    ([colorName, colorShades]) =>
      shades
        .filter((shade) => {
          const index = shade === 50 ? 0 : shade === 950 ? 10 : shade / 100 - 1;
          return colorShades[index] !== undefined;
        })
        .map((shade) => `${colorName}-${shade}`)
  );
  const customColorOptions = Object.keys(customColors).map((color) => color);
  return [...standardColors, ...customColorOptions];
};

export const tailwindToHex = (
  tailwindColor: string,
  brand: string | null
): string => {
  // already hex?
  if (tailwindColor.startsWith(`#`)) return tailwindColor;

  if (tailwindColor.startsWith('bg-brand-')) {
    const brandColor = getBrandColor(`var(--${tailwindColor.slice(3)})`, brand);
    if (brandColor) {
      return brandColor.startsWith('#') ? brandColor : `#${brandColor}`;
    }
  }
  if (tailwindColor.startsWith('brand-')) {
    const brandColor = getBrandColor(`var(--${tailwindColor})`, brand);
    if (brandColor) {
      return brandColor.startsWith('#') ? brandColor : `#${brandColor}`;
    }
  }

  if (tailwindColor.startsWith('bg-')) {
    tailwindColor = tailwindColor.slice(3);
  }
  if (tailwindColor in customColors) {
    return customColors[tailwindColor as keyof typeof customColors];
  }
  const [color, shade] = tailwindColor.split('-');
  if (color in tailwindColors) {
    const shadeIndex =
      shade === '50' ? 0 : shade === '950' ? 10 : parseInt(shade) / 100 - 1;
    return tailwindColors[color as keyof typeof tailwindColors][shadeIndex];
  }
  console.log(`getTailwindColor miss`, tailwindColor, brand);
  return tailwindColor.startsWith('#') ? tailwindColor : `#${tailwindColor}`;
};

export const hexToTailwind = (
  hexColor: string,
  brand?: string | undefined
): string | null => {
  const brandColours = brand ? getBrandColours(brand) : [];
  const lookupColor = hexColor.startsWith(`#`) ? hexColor.slice(1) : hexColor;
  const brandIndex = brandColours.findIndex(
    (color) => color.toLowerCase() === lookupColor.toLowerCase()
  );
  if (brandIndex !== -1) {
    return `brand-${brandIndex + 1}`;
  }

  for (const [colorName, colorHex] of Object.entries(customColors)) {
    if (colorHex.toLowerCase() === hexColor.toLowerCase()) {
      return colorName;
    }
  }
  for (const [colorName, shades] of Object.entries(tailwindColors)) {
    const index = shades.findIndex(
      (shade) => shade.toLowerCase() === hexColor.toLowerCase()
    );
    if (index !== -1) {
      const shade = index === 0 ? 50 : index === 10 ? 950 : (index + 1) * 100;
      return `${colorName}-${shade}`;
    }
  }
  return null;
};

export const colorValues = getTailwindColorOptions();

export const getColor = (
  colorMap: ThemeColorMap,
  theme: Theme = PUBLIC_THEME
): TailwindColor => {
  return colorMap[theme] || 'brand-1';
};

export function rgbToLab(rgb: RGB): { l: number; a: number; b: number } {
  const { r, g, b } = rgb;

  // Normalize RGB values
  const rNormalized = r / 255;
  const gNormalized = g / 255;
  const bNormalized = b / 255;

  // sRGB to XYZ conversion
  let x =
    0.4124564 * rNormalized + 0.3575761 * gNormalized + 0.1804375 * bNormalized;
  let y =
    0.2126729 * rNormalized + 0.7151522 * gNormalized + 0.072175 * bNormalized;
  let z =
    0.0193339 * rNormalized + 0.119192 * gNormalized + 0.9503041 * bNormalized;

  // Normalize for D65 white point
  x /= 0.95047;
  y /= 1.0;
  z /= 1.08883;

  // Convert to LAB
  function labConvert(t: number) {
    if (t > 0.008856) {
      return Math.pow(t, 1 / 3);
    } else {
      return 7.787 * t + 16 / 116;
    }
  }

  const fx = labConvert(x);
  const fy = labConvert(y);
  const fz = labConvert(z);

  const l = 116 * fy - 16;
  const a = 500 * (fx - fy);
  const bLab = 200 * (fy - fz);

  return { l, a, b: bLab };
}

export const findClosestTailwindColor = (
  color: string
): ClosestColor | null => {
  const targetColor = tinycolor(color);
  const targetRgb = targetColor.toRgb();
  const targetLab = rgbToLab(targetRgb);

  if (!targetLab) return null;

  let closestColor: ClosestColor | null = null;
  let closestDistance = Infinity;

  const validShades = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];

  Object.entries(tailwindColors).forEach(([colorName, shades]) => {
    shades.forEach((shade, index) => {
      if (!validShades.includes((index + 1) * 100)) return;

      const shadeColor = tinycolor(shade);
      const shadeRgb = shadeColor.toRgb();
      const shadeLab = rgbToLab(shadeRgb);

      if (shadeLab) {
        const distance = Math.sqrt(
          Math.pow(targetLab.l - shadeLab.l, 2) +
            Math.pow(targetLab.a - shadeLab.a, 2) +
            Math.pow(targetLab.b - shadeLab.b, 2)
        );

        if (distance < closestDistance) {
          closestDistance = distance;
          closestColor = { name: colorName, shade: validShades[index] };
        }
      }
    });
  });

  return closestColor;
};
