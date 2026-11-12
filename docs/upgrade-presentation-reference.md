# Upgrade card presentation

The sibling research repository's `re/bt3/export_scripts/scripts/UpgradeMenu.as`
and matching bytecode define the menu behavior. Root1935 frame2 supplies its steady
layout. `tools/import-upgrade-screen.ts` imports numerical shape paths, placements,
static text advances and dynamic field metrics into `src/game/data/upgrade-screen.json`.
It does not copy images, font outlines, sounds or the SWF. Regenerate with:

```sh
bun tools/import-upgrade-screen.ts /path/to/documented-bubble-tank-3
bun run format
```

The root shade1096 is black at64/255 alpha. Retained foreground consists of
text1929, build-current1923 and three card1916 instances under viewer1917 at
stage(275,212.3). Their local centers are(-181,-35.25), (0,-35.25), (181,-35.25);
each card's bounds are176.5×230. `_‑aG` shifts two available cards to±90.5 and
one to0. The card's two filled rounded panels are separate click regions; their
gap is not filled. Its independent Edit1098 control is50×17 at local(59,58.85).
Retired search1925, parts-pack1931 and separator1906 are deliberately omitted.

Supplied-file mode rasterizes the player's own static symbols and uses extracted
font outlines for dynamic fields. Mock mode paints imported compound paths and
device-font text constrained by the original advances. Mock typography remains an
approximation. The name field is11px/114.45px wide without wrapping; the three
weapon fields are8px/168.95px wide with wrapping. The importer shares the existing
edit-field decoder with the tank viewer; its generated viewer data is unchanged.

`_‑Bz`/`_‑Wp` count category2/3/5 parts and sort by ID. One or two distinct types use
singular/plural names; three or more use short names. The source's unassigned
`substr` calls leave the short-name apostrophe/plural and trailing `", "` intact.
An empty category displays `N/A`. Name lookup retains RetrieveRowObject's2013→5003
alias, independently of the raw-ID upgrade-tier predicate.

`_‑Tr(0)` preview fitting excludes TankLoadingBox helper clips, never enlarges a
small tank, and fits actual Script bounds within158×84. Initial asymmetric bounds
are centered once; animated child artwork continues on the shared stage while
world simulation is paused. One retained renderer supplies the three independent
preview trees. This does not establish every float32/display-constructor detail.

Verification uses the existing original three-offer capture
`research/screenshots/18-levelup-choice-3offers.png` and source geometry. Browser
fixtures restore level-two history explicitly, enter through the public menu and
edit route, and check Nimble/Heavy Seeker/Punisher geometry, summaries, fitted ink
and advancing artwork. They do not demonstrate ordinary earned progression.
The affected saved-library/edit flows also exercise weapon-panel selection and
the separate offer Edit button in mock and supplied-file modes.

The source foreground starts at alpha1. The current presentation does not yet
reproduce its saved-bitmap capture/blur history, delayed bottom handlers, retained
child clock, selection/exit ordering or unresolved-default loading phase. Native
screenshots were inspected, but whole-frame pixel equality, synchronized original
animation/audio, Adobe equivalence and ordinary-input full boss/win remain open.
