'use client';
import { useEffect, useRef } from 'react';
import type { AssetPack } from '@/game/assets/asset-pack';
export function BubbleText({
  children,
  pack,
  size = 24,
  color = '#fff',
  className = '',
  font = 'Billo',
}: {
  children: string;
  pack?: AssetPack | null;
  size?: number;
  color?: string;
  className?: string;
  font?: string;
}) {
  const svg = pack?.textSvg(children, size, color, font);
  if (svg)
    return (
      <img
        className={`bubble-text ${className}`}
        src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`}
        alt={children}
        draggable={false}
        style={{ height: size * 1.4 }}
      />
    );
  return (
    <span className={`bubble-text mock-lettering ${className}`} style={{ fontSize: size, color }}>
      {children}
    </span>
  );
}
export function Icon({
  name,
  size = 24,
}: {
  name:
    | 'play'
    | 'plus'
    | 'settings'
    | 'library'
    | 'back'
    | 'info'
    | 'file'
    | 'fullscreen'
    | 'pause'
    | 'close'
    | 'trash'
    | 'quit'
    | 'undo';
  size?: number;
}) {
  const paths = {
    play: <path d="M8 4 21 12 8 20Z" fill="currentColor" stroke="none" />,
    quit: (
      <>
        <path d="M14 5 5 12 14 19Z" fill="currentColor" stroke="none" />
        <path d="M18 5v14" />
      </>
    ),
    plus: <path d="M12 4v16M4 12h16" />,
    settings: (
      <>
        <path d="m9 3-1 3-3 1 1 3-2 2 2 2-1 3 3 1 1 3h5l1-3 3-1-1-3 2-2-2-2 1-3-3-1-1-3Z" />
        <circle cx="11.5" cy="12" r="3" />
      </>
    ),
    library: (
      <>
        <circle cx="12" cy="12" r="6" />
        <circle cx="6" cy="7" r="3" />
        <circle cx="17" cy="7" r="3" />
        <circle cx="8" cy="18" r="3" />
        <circle cx="18" cy="16" r="3" />
      </>
    ),
    back: <path d="m14 5-7 7 7 7M7 12h14" />,
    info: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 10v7m0-11v1" />
      </>
    ),
    file: (
      <>
        <path d="M6 3h9l4 4v14H6Z" />
        <path d="M9 10h7M9 13h7M9 16h7" />
      </>
    ),
    fullscreen: <path d="M9 3H3v6m12-6h6v6M3 15v6h6m12-6v6h-6" />,
    pause: <path d="M8 5v14M16 5v14" />,
    close: <path d="m5 5 14 14M5 19 19 5" />,
    trash: (
      <>
        <path d="M4 6h16M9 3h6M7 6l1 15h8l1-15M10 10v7M14 10v7" />
      </>
    ),
    undo: <path d="m8 3-5 5 5 5M3 8h10a7 7 0 0 1 0 14" />,
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}
export function Dialog({
  title,
  children,
  onClose,
  className = '',
  closeKey,
}: {
  title: string;
  children: React.ReactNode;
  onClose?: () => void;
  className?: string;
  closeKey?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    return () => previous?.focus({ preventScroll: true });
  }, []);
  return (
    <div className="modal-scrim">
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`dialog ${className}`}
        onKeyDown={(e) => {
          if ((e.key === 'Escape' || e.code === closeKey) && onClose) {
            e.stopPropagation();
            onClose();
          }
          if (e.key === 'Tab') {
            const nodes = ref.current?.querySelectorAll<HTMLElement>(
              'button:not(:disabled),input:not(:disabled),select,textarea,[tabindex="0"]',
            );
            if (!nodes?.length) return;
            const first = nodes[0],
              last = nodes[nodes.length - 1];
            if (e.shiftKey && document.activeElement === first) {
              e.preventDefault();
              last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
              e.preventDefault();
              first.focus();
            }
          }
        }}
      >
        <div className="dialog-heading">
          <h2>{title}</h2>
          {onClose ? (
            <button className="icon-button" aria-label="Close" onClick={onClose}>
              <Icon name="close" size={17} />
            </button>
          ) : null}
        </div>
        {children}
      </div>
    </div>
  );
}
