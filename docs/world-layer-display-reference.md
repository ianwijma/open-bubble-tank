# Retained World sibling layer poses

This local next-batch boundary builds above combined PR149 head
`c91ebe48d3a42f54acc12f7bd1f57214b65088dc`. It retains the source World siblings'
poses and ancestry independently of field roots, Run vectors and engine request /
completion arrays. It does not yet replace the renderer's legacy field-transform
adapter or bind a complete field width/hit service. Those consumer migrations,
actual pickup/effect native poses and ordinary/full-game parity remain unfinished.

`WorldDisplays` retains the bullet1781, top1718, highlight1780 and empty screen
instances. Top and screen reads use the **same concrete identity objects** as
`RegisteredEffects`; this module does not own a second effect child collection.
Engine registration/removal remains authoritative for effect membership and top /
screen attachment. The lower117 is not a World sibling: its pose/parent remain
owned by `FieldDisplays`, and bottom matrix reads traverse that actual nesting.
An effect name disappearing from registration does not detach the actual layer.

## Source phases

Qualified paths below are relative to the read-only sibling research `re/bt3`.
Namespace-qualified pcode and branch chains take precedence over textual AS order.

| Phase | Source | Retained behavior |
| --- | --- | --- |
| World origin | `export_scripts/scripts/Main.as:1112–1116`, `_‑E3` and matching qualified Main pcode | World is added to Main at stage width/2,height/2; Main shake is a distinct translation ancestor. The recreation's fixed logical stage is550×450. |
| First layers | `BTAGameWorld.pcode:1445–1645`, `AS:390–431` | First bullet/top/bottom/screen identities exist before gameplay; the first highlight is created by initial PlaceAvatar at the first field's position. |
| Bullet1781 | `BTAGameWorld.pcode:7575`, private namespace16 `_‑Ii`; `AS:1616–1623`; `_‑dl.as` binding | Copy **current** field X/Y, then add to World. It is not a child of the corresponding field root. |
| Top1718 | `BTAGameWorld.pcode:3696`, private namespace16 `_‑XS`; `AS:901–908`; `_‑My.as` binding | The same current-root X/Y copy and World parenting. |
| Next attachment | `BTAGameWorld.pcode:8433–8775`, `AS:1812–1855`; `_‑Zs.as` binding | Next highlight copies the next root position and replaces scaleY then scaleX with wave scale. Next bullet/top initially copy the outgoing root. Lower117 remains nested beneath next's1540. |
| Movement | `BTAGameWorld.pcode:5292` and6135, private `MoveAvatarToNewBubblefieldLocation` / public `AdjustBubblefieldObjects`; `AS:1201–1306,1348–1388` | After the field/under-avatar writes, current highlight, bullet and top copy current X/Y; latest-next highlight, bullet and top copy next X/Y. Superseded next instances are not rediscovered or updated. Masks follow those sibling writes. |
| Collapse | `_-0D.pcode:699–906`, `AS:196–225` | Original X chain writes avatar, current bottom, top, bullet, highlight and receiver root. The Y chain reads back the root's retained Number scaleX. Translation stays at each actual layer's existing pose. Screen remains independent. |
| Finish / arrival | `_-0D.as:223–234`, `BTAGameWorld.pcode:1055–1443`, `AS:312–399` | Finish sets receiver root/highlight alpha0, not removeChild. Arrival removes old bullet/top/bottom/root before cache reads. The outgoing highlight is removed after next top/bottom registration. |

The numeric pose setters reuse `RetainedTransform`: cached Number scales,
float32-effective matrix columns, truncating coordinate setters and the original
repeated getter arithmetic. Collapse does not reconstruct `1-age/204` and does not
infer the nested lower transform by squaring that reconstructed counter. After119
writes the qualified cached scale is `0.4166666666666692`, with effective matrix
coefficient `0.4166666567325592`. Lower117 composes that coefficient with its
separately retained field root, giving `0.1736111044883728` in the finite control.
These scale facts reuse the preserved original setter controls; no new original
World.Run or ordinary-collapse observation is claimed.

`fieldMatrix`, `bottomMatrix`, `layerMatrix` and `layerGlobal` compose the actual
retained matrices with fixed World and separate Main translation. Detached objects
retain their own matrix but lose those stage ancestors. The existing zoom addition
stays a separate view transform. These are transform reads, not shape, Script-width
or hitTestPoint queries; they do not declare a partial field population complete.
Reads never create layers, advance timeline clocks, draw entropy or repair parents.

World construction, attachment, movement, collapse and promotion now call this
owner at the source phases. The old sibling hooks are bound to the real owner;
observer tests chain those bindings instead of replacing their behavior. Field
root/bottom detachment moves before cache reads, and highlight detachment stays
behind next-layer registration. No gameplay UID or RNG stream is used for display
identities. Pure source hashes and artifacts are retained under
`test-results/world-layer-poses/`.

## Verification and remaining work

Formatting, TypeScript and1,060 tests /9,421 assertions pass. Six new controls pin
instance identity, outgoing-position next construction, retained orphan poses,
independent/nested collapse, pre-cache detach and post-registration highlight
removal, detached ancestry, Main/World composition and pure reads. Existing field
setter/lifecycle assertions remain intact. Production build `fNjhmQSpmM5S0syEdeo9b` and10 affected mock/supplied-art
browser cases pass with zero skips/flaky results. All682 saved source digests
match; private specs retain every assertion and change only ports/import routing.
The cases check crossing, retained next wrappers, collapse, screen effects and
forcefield lifecycle, not painted consumption of the new matrix API. Owned3725/3726
servers exited and ports are free. Exact command:

```sh
BT3_SWF_FILE=/home/ian/Projects/ianwijma/documented-bubble-tank-3/re/bt3/uncompressed.swf bun run test:e2e --config test-results/world-layer-poses/playwright.config.mts
```

The ignored source inputs, prebuild digests, private spec manifest, browser/check
logs, report and validation summary remain in `test-results/world-layer-poses/`.

The renderer currently still consumes its preceding field/collapse adapter.
Complete that migration before claiming this boundary changes painted transforms.
Existing artificial browser fixtures that directly write player coordinates or
transit offsets must explicitly supply their omitted source layout operations;
production must not infer native display state from those scalar edits. The older
collapse fixture's linear/camera assumptions are not an original numeric oracle.
Qualify its new retained avatar/parent expectations against source/runtime evidence,
rather than weakening assertions to keep the old model. Complete field geometry,
source constructor/RNG timing, ordinary earned boss/win and original/Adobe/pixel /
audio/full-game parity remain open.
