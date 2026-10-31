/** Local-only original SWF viewer. This entry point never enters the Next build. */
export {};
import { decompressSWF } from '../src/game/assets/swf.mjs';
const bundle = await Bun.build({
  entrypoints: ['tools/reference/browser.ts'],
  target: 'browser',
  minify: true,
});
if (!bundle.success) throw new AggregateError(bundle.logs, 'Could not build the reference viewer');
const javascript = await bundle.outputs[0].text();
const configured = process.env.BT3_SWF_FILE;
const port = Number(process.env.BT3_REFERENCE_PORT ?? 3103);
const configuredBytes = configured
  ? (await decompressSWF(new Uint8Array(await Bun.file(configured).arrayBuffer()))).bytes
  : null;
const html = `<!doctype html><html lang="en"><meta charset="utf-8"><title>Bubble Tanks 3 — original reference</title>
<style>body{margin:24px;background:#0b2029;color:#d5f3fa;font:14px Arial}main{width:550px;margin:auto}h1{font-size:20px}button,input{margin:6px 8px 6px 0}#stage,ruffle-player{display:block;width:550px;height:450px;background:#142b2c}output,pre{display:block;white-space:pre-wrap;line-height:1.4}pre{max-height:160px;overflow:auto;color:#9db7bf}p{line-height:1.5}</style>
<main><h1>Bubble Tanks 3 — original reference</h1><p>Development reference player using Ruffle 0.7.1. Select your local SWF. Playback is emulation; compare with the recovered source when behavior differs.</p>
<label>Original SWF <input id="swf" type="file" accept=".swf"></label>
${configured ? '<button id="configured">Load configured research SWF</button>' : ''}
<button id="pause" disabled>Pause reference</button><button id="resume" disabled>Resume reference</button>
<div id="stage"></div><output id="status" role="status">Choose a SWF</output><pre id="trace" aria-label="Flash trace"></pre></main>
<script>window.RufflePlayer={config:{publicPath:'/ruffle/',polyfills:false}};</script><script src="/ruffle/ruffle.js"></script><script type="module" src="/reference.js"></script></html>`;
Bun.serve({
  hostname: '127.0.0.1',
  port,
  async fetch(request) {
    const path = new URL(request.url).pathname;
    if (path === '/')
      return new Response(html, {
        headers: {
          'content-type': 'text/html',
          'content-security-policy':
            "connect-src 'self' blob:; img-src 'self' data: blob:; frame-src 'none'; object-src 'none'",
        },
      });
    if (path === '/reference.js')
      return new Response(javascript, { headers: { 'content-type': 'application/javascript' } });
    if (path === '/research.swf' && configuredBytes)
      return new Response(configuredBytes, {
        headers: { 'content-type': 'application/x-shockwave-flash', 'cache-control': 'no-store' },
      });
    if (path === '/favicon.ico') return new Response(null, { status: 204 });
    if (/^\/ruffle\/[\w.-]+\.(js|wasm|map)$/.test(path)) {
      const file = Bun.file(`node_modules/@ruffle-rs/ruffle/${path.split('/').at(-1)}`);
      if (await file.exists())
        return new Response(file, {
          headers: {
            'content-type': path.endsWith('.wasm')
              ? 'application/wasm'
              : path.endsWith('.map')
                ? 'application/json'
                : 'application/javascript',
          },
        });
    }
    return new Response('Not found', { status: 404 });
  },
});
console.log(`Original reference viewer: http://127.0.0.1:${port}`);
