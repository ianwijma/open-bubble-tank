# Numeric effect timeline metadata (local preparation)

This local follow-up prepares retained effect poses and complete field queries.
It is not part of published PR154 and does not change its tested head. No effect
clock, renderer, completion rule or production caller is migrated in this step.
The full recreation objective remains incomplete.

`tools/import-effect-clips.ts` reads the supplied original file and qualified
source exports from the sibling research repository. Run:

```sh
bun tools/import-effect-clips.ts /home/ian/Projects/ianwijma/documented-bubble-tank-3
```

The generated `src/game/data/effect-clips.json` includes fifteen effect roots,
23 recursive sprite timelines and200 leaf symbol references. Its source SHA256 is
`f5827841c682f988f23dcf470ab4ab59c1ffc497acb4ca0f21077d03f942c153`.
The metadata SHA256 is
`085fcfcbc90fa7ee49f20dabba4f1fde3d1cd0c17050c2848cf37d8a04c26ac5`
(232,738bytes). Each root records its actual SymbolClass binding, frame count and qualified class
pcode digest. Binding/count disagreements with the existing effect catalog fail
the import. The original SWF remains local and unchanged.

Only numeric placements, transforms, alpha/color/filter values, names, frame
counts and symbol references are stored. There are no image/audio bytes, vector
paths, glyph outlines or SWF payloads. Leaves refer to geometry resolved by the
browser-supplied asset pack; those IDs alone do not implement their geometry or
supply a complete field query.

The static constructor audit covers every root in `effect-art.json` and
`screen-effect-art.json`. All15 original AS/pcode definitions have plain
MovieClip constructors containing only `super()`, with no root addFrameScript or
stop call. This is a bounded static fact, not an observation of their unparented
frame clocks or descendant scripts. A separate preserved-original `effect-clock-*`
qualification is active. Global constructor/event/RNG and Adobe equivalence are
unproved; the carrier/pickup evidence cannot substitute for generic-root evidence.

Two imports produce byte-identical metadata. An owned independent parse audit
compares all23 selected original sprite records exactly and resolves every leaf:
190 original shapes and10 morphs, with no unknown definitions.
Exact local logs/provenance are under ignored `test-results/effect-metadata/`.
Formatting and TypeScript/unit validation pass1,138 tests /17,360 assertions
on the joint local camera-evidence and metadata branch; production
browser E2E is not repeated because no application flow consumes this data yet.

Next bind an instance-owned pose/clock after qualification, share that actual pose
between painting and geometry, preserve explicit source child mutations, then
compose all real field members and masks before replacing legacy field queries.
Do not introduce a background-only fallback and call the complete query repaired.
