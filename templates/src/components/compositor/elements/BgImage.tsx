import type { BgImageNode, ViewportKey } from '@/types/compositorTypes';

interface BgImageProps {
  payload: BgImageNode;
  viewportKey?: ViewportKey;
}

export const BgImage = ({ payload, viewportKey }: BgImageProps) => {
  // Helper to check if the image should be hidden on a specific viewport
  const isHiddenOnViewport = (
    viewport: 'Mobile' | 'Tablet' | 'Desktop'
  ): boolean => {
    const key = `hiddenViewport${viewport}` as keyof BgImageNode;
    return !!payload[key];
  };

  // Check if we should render as normal image
  const isFlexImage =
    payload.position === 'left' || payload.position === 'right';

  // For viewport-specific rendering
  if (
    viewportKey === 'mobile' ||
    viewportKey === 'tablet' ||
    viewportKey === 'desktop'
  ) {
    const viewportCapitalized =
      viewportKey.charAt(0).toUpperCase() + viewportKey.slice(1);
    const hiddenViewportKey =
      `hiddenViewport${viewportCapitalized}` as keyof BgImageNode;

    // Skip rendering if this viewport should be hidden
    if (payload[hiddenViewportKey]) {
      return null;
    }

    if (isFlexImage) {
      return (
        <img
          src={payload.src}
          {...(payload.srcSet ? { srcSet: payload.srcSet } : {})}
          alt={payload.alt || 'Background image'}
          className={`h-full w-full object-${payload.objectFit || 'cover'}`}
          style={{ objectFit: payload.objectFit || 'cover' }}
        />
      );
    }

    return (
      <div
        className="absolute left-0 top-0 h-full w-full"
        style={{
          backgroundImage: `url(${payload.src})`,
          backgroundSize: payload.objectFit || 'cover',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center',
          zIndex: 0,
        }}
        role="img"
        aria-label={payload.alt || 'Background image'}
      />
    );
  }

  // Build responsive class based on visibility settings
  const buildResponsiveClass = (): string => {
    const hiddenMobile = isHiddenOnViewport('Mobile');
    const hiddenTablet = isHiddenOnViewport('Tablet');
    const hiddenDesktop = isHiddenOnViewport('Desktop');

    const classes = [];

    if (hiddenMobile) classes.push('hidden xs:hidden');
    else classes.push('block');

    if (hiddenTablet) classes.push('md:hidden');
    else if (hiddenMobile) classes.push('md:block');

    if (hiddenDesktop) classes.push('xl:hidden');
    else if (hiddenTablet) classes.push('xl:block');

    return classes.join(' ');
  };

  // Render based on position
  if (isFlexImage) {
    return (
      <img
        src={payload.src}
        {...(payload.srcSet ? { srcSet: payload.srcSet } : {})}
        alt={payload.alt || 'Background image'}
        className={`h-full w-full object-${payload.objectFit || 'cover'} ${buildResponsiveClass()}`}
        style={{ objectFit: payload.objectFit || 'cover' }}
      />
    );
  }

  // Render as background (default)
  return (
    <div
      className={`absolute left-0 top-0 h-full w-full ${buildResponsiveClass()}`}
      style={{
        backgroundImage: `url(${payload.src})`,
        backgroundSize: payload.objectFit || 'cover',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
        zIndex: 0,
      }}
      role="img"
      aria-label={payload.alt || 'Background image'}
    />
  );
};

export default BgImage;
