import { expect, test } from 'bun:test';
import { prepareSound, soundWindow } from '../src/game/assets/sound-window';

function decoded(...channels: number[][]) {
  return {
    sampleRate: 22050,
    length: channels[0].length,
    numberOfChannels: channels.length,
    getChannelData: (i: number) => Float32Array.from(channels[i]),
  };
}
test('source delay/count crop sample frames before channel interleaving and PCM saturation', async () => {
  const blob = soundWindow(decoded([0, -1, 0.25, 1, 0], [0, 1, -0.25, -1, 0]), 1, 3);
  const bytes = await blob.arrayBuffer(),
    view = new DataView(bytes);
  expect(blob.type).toBe('audio/wav');
  expect(view.getUint32(24, true)).toBe(22050);
  expect(view.getUint16(22, true)).toBe(2);
  expect(view.getUint32(40, true)).toBe(12);
  expect(Array.from(new Int16Array(bytes, 44))).toEqual([
    -32768, 32767, 8192, -8192, 32767, -32768,
  ]);
});
test('decoder exhaustion shortens the window without adding an invented silent tail', async () => {
  const bytes = await soundWindow(decoded([0, 0.25, 0.5]), 1, 20).arrayBuffer();
  expect(new DataView(bytes).getUint32(40, true)).toBe(4);
  expect(Array.from(new Int16Array(bytes, 44))).toEqual([8192, 16384]);
});
test('MP3 preparation decodes at the tag rate and preserves source timing rather than raw duration', async () => {
  const blob = new Blob(['MP3']);
  const calls: number[] = [];
  const sound = await prepareSound(
    { id: 561, format: 2, sampleRate: 22050, sampleCount: 2, seek: 1, blob },
    async (bytes, rate) => {
      expect(new TextDecoder().decode(bytes)).toBe('MP3');
      calls.push(rate);
      return decoded([0, 0.25, 0.5, 0.75]);
    },
  );
  expect(calls).toEqual([22050]);
  expect(Array.from(new Int16Array(await sound!.arrayBuffer(), 44))).toEqual([8192, 16384]);
  expect(await prepareSound({ id: 1, format: 3, sampleRate: 22050, sampleCount: 2, blob })).toBe(
    blob,
  );
  expect(
    await prepareSound({ id: 2, format: 1, sampleRate: 22050, sampleCount: 2 }),
  ).toBeUndefined();
});
