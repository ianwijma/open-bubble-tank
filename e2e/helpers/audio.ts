import type { Page } from '@playwright/test';

type AudioProbe = {
  audio: HTMLAudioElement[];
  music: HTMLAudioElement[];
  starts: { index: number; volume: number; currentTime: number }[];
};
type ObservedWindow = Window & { __audioProbe: AudioProbe };

/** Observe real media calls; source music starts at0 for a fade or0.8 for a restart. */
export async function watchAudio(page: Page) {
  await page.addInitScript(() => {
    const NativeAudio = window.Audio;
    const probe: AudioProbe = { audio: [], music: [], starts: [] };
    Object.defineProperty(window, '__audioProbe', { value: probe });
    window.Audio = new Proxy(NativeAudio, {
      construct(target, args) {
        const element = new target(args[0]);
        probe.audio.push(element);
        const play = element.play;
        element.play = function () {
          if ((this.volume === 0 || this.volume === 0.8) && !probe.music.includes(this))
            probe.music.push(this);
          probe.starts.push({
            index: probe.audio.indexOf(this),
            volume: this.volume,
            currentTime: this.currentTime,
          });
          return play.call(this);
        };
        return element;
      },
    });
  });
}

export async function musicState(page: Page) {
  return page.evaluate(() => {
    const probe = (window as unknown as ObservedWindow).__audioProbe;
    return probe.music.map((audio) => ({
      src: audio.src,
      volume: audio.volume,
      paused: audio.paused,
      loop: audio.loop,
      currentTime: audio.currentTime,
      duration: audio.duration,
      error: !!audio.error,
      starts: probe.starts.filter((start) => start.index === probe.audio.indexOf(audio)),
    }));
  });
}

export async function musicPlaying(page: Page) {
  const music = (await musicState(page)).at(-1);
  return !!music && !music.paused && music.currentTime > 0 && !music.error;
}

export async function pauseMusic(page: Page) {
  await page.evaluate(() =>
    (window as unknown as ObservedWindow).__audioProbe.music.at(-1)!.pause(),
  );
}

export async function soundPlayed(page: Page) {
  return page.evaluate(() => {
    const probe = (window as unknown as ObservedWindow).__audioProbe;
    return probe.audio.some(
      (audio) => !probe.music.includes(audio) && audio.duration > 0 && !audio.error,
    );
  });
}
