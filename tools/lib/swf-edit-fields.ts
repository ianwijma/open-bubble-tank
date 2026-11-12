import type { SymbolResult, DisplayPlacement } from '../../src/game/assets/asset-pack';

export function editTextFields(symbols: SymbolResult['symbols'], placements: DisplayPlacement[]) {
  return placements.flatMap((p) => {
    const t = symbols.editTexts.find((t) => t.id === p.charId);
    if (!t) return [];
    const font = symbols.fonts.find((f) => f.id === t.fontId)!;
    const size = t.fontHeight / 20,
      ascent = (font.ascent ?? 20480) / 20,
      descent = (font.descent ?? 0) / 20;
    return [
      {
        matrix: p.matrix,
        name: p.name ?? `text${p.charId}`,
        symbol: p.charId,
        initialText: t.text
          .replace(/<\/p>/gi, '\n')
          .replace(/<[^>]*>/g, '')
          .replace(
            /&(nbsp|apos|quot|amp|lt|gt);/g,
            (_, key) =>
              (
                ({ nbsp: ' ', apos: "'", quot: '"', amp: '&', lt: '<', gt: '>' }) as Record<
                  string,
                  string
                >
              )[key] ?? '',
          )
          .trimEnd(),
        x: t.bounds.xMin / 20,
        y: t.bounds.yMin / 20,
        width: (t.bounds.xMax - t.bounds.xMin) / 20,
        height: (t.bounds.yMax - t.bounds.yMin) / 20,
        fontId: font.id,
        font: font.name.replaceAll('\0', ''),
        size,
        ascent,
        lineHeight: ((ascent + descent) * size) / 1024 + (t.leading ?? 0) / 20,
        color: t.color ?? [255, 255, 255, 255],
        align: t.align ?? 0,
        spacing: Number(t.text.match(/letterSpacing="([\d.-]+)"/)?.[1] ?? 0),
        bold: !!font.bold,
        italic: !!font.italic,
        wordWrap: !!t.flags?.wordWrap,
        deviceFont: !t.flags?.useOutlines,
        maxLength: t.maxLength,
        advances: Object.fromEntries(
          font.codeTable.map((c, i) => [
            String.fromCharCode(c),
            (font.advances?.[i] ?? 10240) / 20,
          ]),
        ),
      },
    ];
  });
}
