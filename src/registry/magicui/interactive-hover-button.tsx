import { ButtonHTMLAttributes, useMemo, useState } from 'react';

type InteractiveHoverButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

export function InteractiveHoverButton({
  children,
  className = '',
  onPointerMove,
  onMouseLeave,
  style,
  ...props
}: InteractiveHoverButtonProps) {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  const gradientStyle = useMemo(
    () => ({
      background: `radial-gradient(120px circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(255,255,255,0.35), transparent 70%)`,
    }),
    [mousePosition],
  );

  return (
    <button
      {...props}
      className={`group relative overflow-hidden rounded-full bg-gray-900 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-transform duration-200 hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gray-900 ${className}`}
      onPointerMove={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        setMousePosition({
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
        });
        onPointerMove?.(event);
      }}
      onMouseLeave={(event) => {
        setMousePosition({ x: event.currentTarget.clientWidth / 2, y: event.currentTarget.clientHeight / 2 });
        onMouseLeave?.(event);
      }}
      style={{
        ...style,
      }}
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900" />
      <div
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
        style={gradientStyle}
      />
      <span className="relative z-10">{children}</span>
    </button>
  );
}

