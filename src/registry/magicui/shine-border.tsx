import { CSSProperties, HTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

interface ShineBorderProps extends HTMLAttributes<HTMLDivElement> {
  shineColor?: string | string[];
  borderWidth?: number;
  duration?: number;
}

export function ShineBorder({
  className,
  shineColor = ['#A07CFE', '#FE8FB5', '#FFBE7B'],
  borderWidth = 1,
  duration = 6,
  style = {},
  ...props
}: ShineBorderProps) {
  const colorStops = Array.isArray(shineColor) ? shineColor.join(',') : shineColor;

  return (
    <div
      aria-hidden="true"
      {...props}
      className={cn(
        'pointer-events-none absolute inset-0 size-full rounded-[inherit]',
        className,
      )}
      style={{
        '--shine-border-width': `${borderWidth}px`,
        '--shine-border-duration': `${duration}s`,
        backgroundImage: `radial-gradient(transparent, transparent, ${colorStops}, transparent, transparent)`,
        backgroundSize: '300% 300%',
        mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
        WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
        WebkitMaskComposite: 'xor',
        maskComposite: 'exclude',
        padding: 'var(--shine-border-width)',
        animation: 'shine-border var(--shine-border-duration) linear infinite',
        ...style,
      }}
    />
  );
}
