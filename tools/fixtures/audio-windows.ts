import type { AssetPack } from '../../src/game/assets/asset-pack';
import { mockAudio } from '../../src/game/services/mock-audio';

/** Inspect the actual ready-to-play blobs, independently decoding their WAV headers/data. */
export async function showAudioWindows(pack: AssetPack, host: HTMLElement) {
  host.replaceChildren();
  const sounds =
    pack.mode === 'mock'
      ? new Map([561, 562, 563, 564, 565, 566, 567, 568].map((id) => [id, mockAudio(id)]))
      : pack.sounds;
  const proof = [];
  for (const [id, blob] of sounds) {
    const bytes = await blob.arrayBuffer(),
      header = new DataView(bytes),
      headerFrames = header.getUint32(40, true) / header.getUint16(32, true),
      signature = new TextDecoder().decode(bytes.slice(0, 4));
    const decoded = await new OfflineAudioContext(2, 1, 22050).decodeAudioData(bytes);
    let peak = 0;
    for (let channel = 0; channel < decoded.numberOfChannels; channel++)
      for (const value of decoded.getChannelData(channel)) peak = Math.max(peak, Math.abs(value));
    proof.push({
      id,
      mime: blob.type,
      signature,
      sampleRate: decoded.sampleRate,
      channels: decoded.numberOfChannels,
      frames: decoded.length,
      duration: decoded.duration,
      headerFrames,
      peak,
    });
  }
  return proof;
}
