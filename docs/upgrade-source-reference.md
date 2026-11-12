# Offline upgrade defaults

The base-game source is the sibling research repository's `re/bt3/export_scripts/scripts`;
the matching `export_pcode/scripts/*.pcode` resolves the obfuscated tier lookup. This
contract covers the local fallback for the retired server search, not synchronized
constructor/RNG timing or complete upgrade-screen visual parity.

`PlayerProfile._-L6` imports `_‑HJ._‑7G` in source order. The31 imported avatar codes
match `data/tanks.json` in that same order. `_‑1Y` stores each avatar's class, actual
Gun Points and computed `TIER`. Tier is the greater of:

- The number of consecutive class GP thresholds less than or equal to actual GP.
  Zero thresholds count; a class-four body-only record starts at tier2.
  GetDefaultTank casts an absent level-zero budget entry to int0.
- The highest **zero-based** `_‑JY` row containing a raw part ID, returned by `_‑HM`.
  This is different from the one-based playable unlock level in `parts.json`.
  An ID absent from those rows contributes zero. Do not apply a rendering alias.

`UpgradeMenu._‑96` requests the previous, current and next classes in that order,
bounded only to1–6. The fresh profile's preference flags (`_‑YZ=false`, `_‑TO=true`,
others false) consume one `_‑Wq(1,2)` roll per requested class. The unavailable server
route reaches `SearchFailed`; both paths use `GetDefaultTank`. There is no additional
random choice among equally priced local tanks.

`GetDefaultTank` scans the local avatar records backwards and requires exact class,
exact current class GP budget and exact current level/tier. The latest matching saved
avatar therefore replaces an earlier builtin or saved record. Under-budget designs,
different tiers and enemy records do not substitute. It does not independently test
current unlocked parts or apply the creator's current maximum-class cap.

Fresh builtin results, by level and classes1–6:

| Level | Class1 | Class2 | Class3 | Class4 | Class5 | Class6 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Infiltrator | Sturdy | — | — | — | — |
| 2 | Nimble | Heavy Seeker | Punisher | — | — | — |
| 3 | Super Nimble | Firestorm | Guardian | Hellbug | — | — |
| 4 | Striker | Aggressor | Shock and Awe | Super Hellbug | The One Tank | — |
| 5 | Super Striker | Inferno | Annihilator | Imperator | Battle-Bubble II | Destroyer |
| 6 | Assassin | The Harbinger | Merciless | Death Larva | Nova Tank | The Forsaken |

The existing original capture `research/screenshots/18-levelup-choice-3offers.png`
shows the level-two Nimble / Heavy Seeker / Punisher set. That is a bounded public
reference, not proof of all table entries by runtime execution. The remaining entries
follow the source predicate and imported codes.

The app's saved avatar library remains live independently of its optional saved-enemy
roster. Opening a choice menu snapshots its offers; saving/importing/deleting library
records affects the next lookup, without replacing an already displayed offer.
Retained part unlocks remain separate: an earned Radar can remain legal in a lower-tier
creator, while its cached default-offer tier fails the lower-tier lookup.

`_‑aG` removes unavailable viewers and shifts the others by90.5px per missing side;
the final recenter runs only once its loading counter reaches zero. A missing exact
default can leave that original loading phase pending. The offline panel still presents
its resolved list immediately. [The presentation follow-up](upgrade-presentation-reference.md)
replaces approximate card artwork, fields and preview fitting. Bitmap capture/blur,
loading/fade and selection/exit timelines remain unfinished. General scene-construction/random-stream interleaving,
original/Adobe comparison and an ordinary-input full boss/win run remain unfinished.
