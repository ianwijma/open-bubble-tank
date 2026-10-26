import { decompressSWF } from '../../src/game/assets/swf.mjs';
interface Player extends HTMLElement {
  ruffle(): {
    load(options: Record<string, unknown>): Promise<void>;
    suspend(): void;
    resume(): void;
    metadata: { width: number; height: number; frameRate: number } | null;
    traceObserver: ((message: string) => void) | null;
  };
}
declare global {
  interface Window {
    RufflePlayer: { newest(): { createPlayer(): Player } };
  }
}
const stage = document.querySelector<HTMLDivElement>('#stage')!;
const status = document.querySelector<HTMLOutputElement>('#status')!;
const trace = document.querySelector<HTMLPreElement>('#trace')!;
const file = document.querySelector<HTMLInputElement>('#swf')!;
const pause = document.querySelector<HTMLButtonElement>('#pause')!;
const resume = document.querySelector<HTMLButtonElement>('#resume')!;
let player: Player | undefined;
let movieUrl: string | undefined;
async function load(bytes: Uint8Array, name: string, url?: string) {
  status.textContent = 'Loading original SWF…';
  status.dataset.ready = 'false';
  pause.disabled = resume.disabled = true;
  try {
    const { bytes: uncompressed } = await decompressSWF(bytes);
    player?.remove();
    if (movieUrl) URL.revokeObjectURL(movieUrl);
    movieUrl = url
      ? undefined
      : URL.createObjectURL(new Blob([uncompressed], { type: 'application/x-shockwave-flash' }));
    player = window.RufflePlayer.newest().createPlayer();
    stage.replaceChildren(player);
    const api = player.ruffle();
    const lines: string[] = [];
    api.traceObserver = (message) => {
      lines.push(message);
      trace.textContent = lines.slice(-20).join('\n');
    };
    await api.load({
      url: url ?? movieUrl,
      autoplay: 'on',
      splashScreen: false,
      unmuteOverlay: 'hidden',
      allowScriptAccess: false,
      allowNetworking: 'none',
      openUrlMode: 'deny',
      // The legacy WebGL backend cannot execute the original BitmapData.draw calls.
      preferredRenderer: 'wgpu-webgl',
      quality: 'high',
    });
    status.textContent = `Loaded ${name} · Ruffle 0.7.1 · original SWF`;
    status.dataset.ready = 'true';
    pause.disabled = resume.disabled = false;
  } catch (error) {
    status.textContent = String(error);
  }
}
file.addEventListener('change', async () => {
  const selected = file.files?.[0];
  if (selected) await load(new Uint8Array(await selected.arrayBuffer()), selected.name);
});
document.querySelector('#configured')?.addEventListener('click', async () => {
  const response = await fetch('/research.swf');
  await load(new Uint8Array(await response.arrayBuffer()), 'Bubble Tanks 3.swf', '/research.swf');
});
pause.addEventListener('click', () => player?.ruffle().suspend());
resume.addEventListener('click', () => player?.ruffle().resume());
window.addEventListener('error', (event) => {
  status.dataset.ready = 'false';
  status.textContent = `Reference runtime error: ${event.message}`;
});
