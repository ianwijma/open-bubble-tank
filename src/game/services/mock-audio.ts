/** Small PCM tones for the asset-free mode; no files, network or audio library required. */
export function mockAudio(id: number): Blob {
  const music = id === 567 || id === 568,
    rate = 22050;
  const duration = music ? 8 : id === 565 || id === 566 ? 0.25 : 0.09;
  const count = Math.floor(duration * rate),
    buffer = new ArrayBuffer(44 + count * 2),
    view = new DataView(buffer);
  const text = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i));
  };
  text(0, 'RIFF');
  view.setUint32(4, 36 + count * 2, true);
  text(8, 'WAVE');
  text(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, rate, true);
  view.setUint32(28, rate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  text(36, 'data');
  view.setUint32(40, count * 2, true);
  const notes =
    id === 568
      ? [220, 0, 261.63, 0, 293.66, 0, 261.63, 0, 196, 0, 220, 0, 174.61, 0, 196, 0]
      : [110, 0, 130.81, 0, 146.83, 0, 130.81, 0, 98, 0, 110, 0, 87.31, 0, 98, 0];
  const pitch =
    ({ 561: 220, 562: 660, 563: 110, 564: 80, 565: 65, 566: 90 } as Record<number, number>)[id] ??
    220;
  for (let i = 0; i < count; i++) {
    const time = i / rate,
      local = music ? time % 0.5 : time;
    const frequency = music
      ? notes[Math.floor(time * 2) % notes.length]
      : pitch * (1 - (0.35 * time) / duration);
    const envelope =
      Math.min(1, local / 0.005) * Math.max(0, 1 - local / (music ? 0.42 : duration));
    const value = frequency
      ? Math.sin(2 * Math.PI * frequency * time) * envelope * (music ? 0.035 : 0.14)
      : 0;
    view.setInt16(44 + i * 2, value * 32767, true);
  }
  return new Blob([buffer], { type: 'audio/wav' });
}
