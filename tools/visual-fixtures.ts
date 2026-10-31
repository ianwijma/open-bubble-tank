/** Development-only visual QA server. No fixture routes or hooks enter the Next.js build. */
export {};
const build = await Bun.build({
  entrypoints: ['tools/fixtures/browser.ts'],
  target: 'browser',
  minify: true,
});
if (!build.success) throw new AggregateError(build.logs, 'Could not build visual fixtures');
const bundle = await build.outputs[0].text();
const cssBuild = await Bun.build({
  entrypoints: ['src/app/globals.css'],
  target: 'browser',
  minify: true,
});
if (!cssBuild.success)
  throw new AggregateError(cssBuild.logs, 'Could not build shared game styles');
const css = await cssBuild.outputs[0].text();
const html = `<!doctype html><html lang="en"><meta charset="utf-8"><title>Bubble Tanks 3 visual fixtures</title>
<link rel="stylesheet" href="/game.css">
<style>body{margin:30px;background:#0b2029;color:#d5f3fa;font:14px Arial}main{width:550px;margin:auto}h1{font-size:20px}main>label{display:block;margin:12px 0}main>button,main>label select,#pause-flow-controls button{font:inherit;padding:6px;background:#234553;color:white;border:1px solid #7096a4}#stage{width:550px;height:450px;margin:20px 0;background:#0b3c5a}canvas{width:550px;height:450px}output{display:block;line-height:1.6}main>p{color:#a2c5d2}#stage{position:relative}.modal-scrim{position:absolute;inset:0;backdrop-filter:blur(3px)}.stage-dialog{position:absolute;inset:0;width:550px;height:450px;overflow:hidden}.dialog-heading,.sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)}.win-screen img{max-width:none}.win-screen-button:focus-visible{outline:1px solid white}.main-stage{position:relative;width:550px;height:450px}.main-flashes{position:absolute;left:-40px;top:-40px;width:630px;height:530px;z-index:30;pointer-events:none}.game-canvas{position:absolute;inset:0;outline:0;touch-action:none}.game-canvas canvas{display:block;width:550px!important;height:450px!important}</style>
<main><h1>Bubble Tanks 3 visual fixtures</h1><p>Deterministic simulation snapshots for comparison with Flash. Supply the original SWF locally.</p>
<label>Original SWF <input id="swf" type="file" accept=".swf"></label>
<button id="mock">Use mock assets</button><label>Fixture <select id="fixture"><option value="hotkey-input">Flash hotkey input</option><option value="pause-flow">Retained pause and Info transition</option><option value="playthrough">Complete control-only playthrough</option><option value="healing" selected>Healing beam</option><option value="win-screen">Win screen</option><option value="shape-contact">Flash geometric contact and attached artwork</option><option value="degradation">Body damage and healing</option><option value="damage">Damage beam</option><option value="turret-1">Turret stage 1</option><option value="turret-2">Turret stage 2</option><option value="turret-3">Turret stage 3</option><option value="turret-4">Turret stage 4</option><option value="statuses">Tank status effects</option><option value="ink">Ink screen effect</option><option value="protection">Shield and forcefield</option><option value="downgrade">Tank downgrade</option><option value="travel">Field crossing</option><option value="crossing-combat">Active crossing populations</option><option value="pickups">Pickup collision and collection</option><option value="seeker-mines">Seeker-mine contact and clocks</option><option value="projectile-order">Projectile contact order</option><option value="glows">Authored glow filters and color transforms</option><option value="collapse">Apocalypse collapse and isolated erase</option><option value="main-effects">Main shake and flash controller</option><option value="screen-effects">Ink and collapse screen effects</option><option value="turret-protection">Turret protection lifecycle</option><option value="shield-ownership">Independent shield mounts</option><option value="forcefield-order">Forcefield child order and retained shield film</option><option value="forcefield-lifecycle">Forcefield cleanup and reconstruction</option><option value="mounted-art">Mounted Massive Cannon charges</option><option value="tank-art">Tank art clocks and protection sizing</option><option value="bubble-buster">Bubble Buster and deflected walls</option><option value="part-snapshots">Part snapshots and body class measurement</option><option value="mock-body-motion">All20 animated body parts</option><option value="mock-part-motion">All31 animated weapon and behavior references</option><option value="mock-parts">Mock gun and behavior layouts</option><option value="mock-assets">Mock colors and projectile size comparison</option><option value="projectile-clocks">Whip, Grow and Flak clocks</option><option value="special-projectiles">Starburst, Spinner, Repulsor, Sapper and Converter</option><option value="combat-effects">Combat effects and rocket trails</option><option value="player-clocks">Player input and timer clocks</option><option value="field-overlays">Field captions and edit sliders</option><option value="tactical-hud">Radar, enemy health and ally health rings</option><option value="hud">Life and weapon HUD</option><option value="minimap">Minimap clipping and traversal history</option><option value="playback">Scripted part playback / pixel contact</option><option value="morphs">Morph raster/SVG comparison</option></select></label>
<label>Camera zoom <input id="zoom" type="range" min="50" max="150" value="100"></label>
<button id="step" disabled>Advance 10 frames</button> <button id="downgrade" disabled>Downgrade tank</button> <button id="secondary" disabled>Secondary attack</button> <button id="hit" disabled>Hit forcefield</button><div id="stage"></div><output id="status" aria-live="polite">Choose a SWF</output></main><script type="module" src="/fixture.js"></script></html>`;
Bun.serve({
  hostname: '127.0.0.1',
  port: Number(process.env.BT3_FIXTURE_PORT ?? 3102),
  fetch(request) {
    const path = new URL(request.url).pathname;
    if (path === '/') return new Response(html, { headers: { 'content-type': 'text/html' } });
    if (path === '/game.css') return new Response(css, { headers: { 'content-type': 'text/css' } });
    if (path === '/fixture.js')
      return new Response(bundle, { headers: { 'content-type': 'application/javascript' } });
    return new Response('Not found', { status: 404 });
  },
});
console.log('Visual fixtures ready at http://127.0.0.1:3102');
