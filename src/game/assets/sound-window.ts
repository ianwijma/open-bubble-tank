import { pcmToWav } from './swf.mjs';

export interface SwfSound {
  id: number;
  format: number;
  sampleRate: number;
  sampleCount: number;
  seek?: number;
  blob?: Blob;
}
type DecodedSound = Pick<
  AudioBuffer,
  'sampleRate' | 'length' | 'numberOfChannels' | 'getChannelData'
>;

/** DefineSound MP3 delay/count are sample frames, not bytes or interleaved channel samples. */
export function soundWindow(decoded: DecodedSound, seek: number, count: number): Blob {
  const start = Math.max(0, seek),
    frames = Math.max(0, Math.min(count, decoded.length - start)),
    channels = decoded.numberOfChannels,
    data = new Uint8Array(frames * channels * 2),
    view = new DataView(data.buffer);
  for (let channel = 0; channel < channels; channel++) {
    const samples = decoded.getChannelData(channel);
    for (let frame = 0; frame < frames; frame++)
      view.setInt16(
        (frame * channels + channel) * 2,
        Math.max(-32768, Math.min(32767, Math.round(samples[start + frame] * 32768))),
        true,
      );
  }
  return new Blob([pcmToWav(data, decoded.sampleRate, 16, channels)], { type: 'audio/wav' });
}

/** Decode before exposing ready assets, so first-use shots do not wait on an audio promise. */
export async function prepareSound(
  sound: SwfSound,
  decode = (bytes: ArrayBuffer, sampleRate: number): Promise<DecodedSound> =>
    new OfflineAudioContext(2, 1, sampleRate).decodeAudioData(bytes),
): Promise<Blob | undefined> {
  if (!sound.blob || sound.format !== 2) return sound.blob;
  const decoded = await decode(await sound.blob.arrayBuffer(), sound.sampleRate);
  return soundWindow(decoded, sound.seek ?? 0, sound.sampleCount);
}
