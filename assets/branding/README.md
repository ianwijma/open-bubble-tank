# Open Bubble Tank icon

Original project icon generated with the built-in imagegen tool. This is new branding artwork, not an extracted Bubble Tanks 3 asset.

`open-bubble-tank-icon.png` is the full-resolution square design. The translucent cyan body, bubble lobes, golden cannon, and dark blue background draw on the game's visual vocabulary. This deliverable is a design asset; it is not wired into the application.

`open-bubble-tank-icon-transparent.png` is the updated icon with a transparent background. The original background version remains available above. The background removal used the built-in imagegen tool with the original PNG as its edit target.

## Background removal prompt

```text
Use case: background-extraction. Edit the supplied Open Bubble Tank icon by removing ONLY the background. Keep the exact existing bubble tank design unchanged: same shape, proportions, framing, placement, cyan body colors, three overlapping lower bubble lobes, white curved highlights, internal tiny bubbles, luminous pale cyan rims, and gold cannon pointing upper right. Remove the navy/teal backdrop, background glow, and all detached floating bubbles outside the tank silhouette. Output a clean PNG cutout with genuinely transparent alpha outside the tank, including gaps between its lobes. Preserve the tank's original rich blue interior shading and crisp outer rims. Do not redesign, redraw, recolor, rotate, rescale, simplify, or add details. No background color, no checkerboard painted into the image, no text. Only the background changes.
```

## Edge cleanup prompt

```text
Use case: background-extraction. Refine ONLY the alpha cutout boundary of this already-transparent bubble-tank icon. Remove ALL ragged white/cyan/yellow fringe, detached specks, flecks, stray pixels, and residual glow outside the smooth intended silhouette. The edges must be smooth precise antialiased curves that look clean on black, white, or colored backgrounds. Keep every visible part of the tank itself unchanged: all bubble circles, internal gradients, blue shading, white highlights, gold cannon, proportions, exact framing and scale. Do not enlarge or shrink the subject, do not change its design, do not alter its interior, do not add a stroke or halo. Background and gaps must remain genuinely fully transparent. Output PNG with alpha.
```

## Generation prompt

```text
Use case: logo-brand
Asset type: finished square app icon for the Open Bubble Tank game project, 1024 x 1024 PNG.
Primary request: Create one polished, distinctive icon of a top-down bubble tank, inspired by the project's aquatic Flash arcade visual style. A large translucent cyan-blue circular bubble body with a crisp pale cyan rim, three smaller overlapping bubble lobes arranged around the lower half, and one short golden-yellow rounded cannon pointing diagonally toward the upper right. The tank is made of bubbles, with no wheels or treads. Keep the geometry bold, coherent, and easy to recognize at 32 pixels.
Scene/backdrop: full-bleed square background in deep navy and dark teal with a restrained soft radial glow behind the tank. No rounded outer corners, no border, no surrounding mockup.
Style/medium: clean vector-like game emblem with restrained luminous gradients, subtle curved white bubble highlights, smooth precise edges; cheerful underwater arcade mood. Avoid photorealism, metallic military realism, complex 3D rendering, and excessive neon bloom.
Composition/framing: one centered tank occupying roughly 75 percent of the canvas; generous clear padding. The golden cannon must be clearly attached to the main body and extend beyond its rim. Strong contrast between tank and backdrop. Minimal detail, bold simple shapes.
Text: none. No letters, labels, watermark, badges, or extra symbols. Original project branding artwork, not copied game sprites.
```
