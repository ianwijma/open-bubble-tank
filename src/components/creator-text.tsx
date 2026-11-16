'use client';
import {
  creatorTextLines,
  creatorGlyphLayout,
  type CreatorField,
} from '@/game/core/creator-palette';
export function CreatorText({
  field,
  text,
  x = field.x,
  y = field.y,
  opacity = 1,
}: {
  field: CreatorField;
  text: string;
  x?: number;
  y?: number;
  opacity?: number;
}) {
  const measure = (value: string) => creatorGlyphLayout(value, field).width;
  const lines = creatorTextLines(text, field.width - 4, measure, field.wordWrap);
  return (
    <span
      className="creator-text-field"
      data-creator-field={field.name}
      style={{
        left: x,
        top: y,
        width: field.width,
        height: field.height,
        fontSize: field.size,
        color: `rgb(${field.color.slice(0, 3).join(',')})`,
        opacity: (opacity * (field.color[3] ?? 255)) / 255,
      }}
    >
      <span className="sr-only">{text}</span>
      {field.deviceFont ? (
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: 2,
            top: 2,
            right: 2,
            fontFamily: 'Arial, sans-serif',
            fontWeight: field.bold ? 'bold' : 'normal',
            fontStyle: field.italic ? 'italic' : 'normal',
            lineHeight: `${field.lineHeight}px`,
            whiteSpace: field.wordWrap ? 'pre-wrap' : 'pre',
            textAlign: field.align === 2 ? 'center' : field.align === 1 ? 'right' : 'left',
          }}
        >
          {text.replaceAll('\r', '\n')}
        </span>
      ) : (
        lines.map((line, i) => {
          const width = measure(line);
          return (
            <span
              key={i}
              aria-hidden="true"
              style={{
                position: 'absolute',
                left:
                  field.align === 2
                    ? (field.width - width) / 2
                    : field.align === 1
                      ? field.width - 2 - width
                      : 2,
                top: 2 + field.size * (field.ascent / 1024 - 1) + i * field.lineHeight,
                whiteSpace: 'pre',
                fontFamily: field.font.startsWith('Arial') ? 'Arial, sans-serif' : 'monospace',
                fontWeight: field.bold ? 'bold' : 'normal',
                fontStyle: field.italic ? 'italic' : 'normal',
                letterSpacing: field.spacing,
              }}
            >
              {creatorGlyphLayout(line, field).glyphs.map((g, index) => (
                <span key={index} style={{ position: 'absolute', left: g.x, top: 0 }}>
                  {g.char}
                </span>
              ))}
            </span>
          );
        })
      )}
    </span>
  );
}
