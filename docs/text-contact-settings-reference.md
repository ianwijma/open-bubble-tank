# Text contact settings retained from the supplied file

The symbol extractor now retains each tag74 `CSMTextSettings` record in file
order. It preserves the two-bit renderer selection, three-bit grid-fit field and
two little-endian float32 values without replacing unsupported values with a
Boolean/default. A tag slice's byte offset and signed zero remain intact. The
existing retained `AssetPack.symbols` inventory carries this metadata; no painting
or contact caller consumes it yet.

The layout follows Adobe's [SWF19 specification, CSMTextSettings](https://open-flash.github.io/mirrors/swf-spec-19.pdf#page=176).
[Ruffle v0.7.1's reader](https://github.com/ruffle-rs/ruffle/blob/v0.7.1/swf/src/read.rs#L857)
corroborates the ID/flags/FLOAT offsets for the valid fields used by this file.
The parser retains all three declared grid bits, including unsupported values;
the tagged reader's narrower enum decoding is not substituted for raw metadata.
Neither source proves the revision of the loaded runtime or Adobe behavior.

This selection matters for geometric queries. The tagged
[static-text implementation](https://github.com/ruffle-rs/ruffle/blob/v0.7.1/core/src/display_object/text.rs#L191)
has a world-bounds gate followed by an immediate hit for advanced text, while
ordinary text follows glyph shapes and text/glyph transforms. Its fetched digest
is recorded in [the earlier investigation](field-query-mask-qualification.md).
Raster alpha cannot establish either contract. This remains static source
evidence until genuine original static-text controls measure it.

## Actual input inventory

Read-only input:
`/home/ian/Projects/ianwijma/documented-bubble-tank-3/re/bt3/uncompressed.swf`,
SHA-256 `f5827841c682f988f23dcf470ab4ab59c1ffc497acb4ca0f21077d03f942c153`.
Its already-expanded CWS header is normalized only in memory by the existing
validated BT3 container path. No source file is rewritten.

An independent Python tag-envelope walk and `struct.unpack('<HBffB')` body decode
matches every extracted record: **422 tags / 422 unique text IDs**. Reserved bits
and the trailing reserved byte are zero. All records select renderer1 and zero
thickness/sharpness: 357 select grid2,65 select grid1. This is a binary inventory,
not an execution trace.

Walking actual sprite1667 placement references reaches eight static texts,
**1659–1666**. All eight have explicit renderer1/grid2 settings. The overall
inventory has378 static and237 editable text definitions. Do not generalize the
tutorial result to every text or treat the presence of a tag as runtime getter
evidence. The independent audit retains per-tag offsets/body hashes and exact
input identity under ignored `test-results/text-geometry-inventory/`.

## Validation and next boundary

The literal-byte parser tests independently cover mode/grid fields, offset
slices, signed fractional floats, negative zero, truncated records and ordered
inventory retention. The supplied-file integration test pins all422 records and
the eight exact tutorial settings. Reproduce with:

Formatting and the supplied-file full check pass **1196 tests / 19444 assertions**.
The focused parser/supplied-file cohort passes **10 tests / 664 assertions**.
No page or application server was started for this metadata change.

```sh
BT3_SWF_FILE=/home/ian/Projects/ianwijma/documented-bubble-tank-3/re/bt3/uncompressed.swf bun test tests/csm-text-settings.test.ts tests/swf.test.ts
bun run format
BT3_SWF_FILE=/home/ian/Projects/ianwijma/documented-bubble-tank-3/re/bt3/uncompressed.swf bun run check
```

The later [original contact controls](text-contact-runtime-reference.md) measure
those leaves, including empty margins, rotation, visibility, masks and attachment.
They establish the finite advanced branch and reveal StaticText-specific mask
and singular behavior. Exact Engine-bounds arithmetic remains unresolved.
[Player-root argument mapping](root-query-runtime-reference.md) is qualified
separately. Resolve the remaining Engine/dispatch contract before selecting the
text leaf path in the complete field provider. This metadata change
does not alter paint, alpha hits, gameplay, native field-query callers, or public
coordinate semantics. No application browser flow is changed or E2E claimed;
complete text/field, ordinary-game and Adobe parity remain unproved.
