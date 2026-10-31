import { expect, test } from 'bun:test';
import { CREDITS, CreditsMotion, creditCopy } from '../src/game/core/credits-screen';
import { buildDisplayList } from '../src/game/assets/display-list';
import type { SpriteInfo } from '../src/game/assets/asset-pack';
import {
  CREDIT_WEBSITE_URLS,
  legacyWebsites,
  ServiceUnavailable,
} from '../src/game/services/extensions';
const sprites = new Map(CREDITS.sprites.map((s) => [s.id, s as SpriteInfo]));
const source = {
  spriteInfo: (id: number) => sprites.get(id),
  displayList: (id: number, frame: number) =>
    sprites.has(id) ? buildDisplayList(sprites.get(id)!, frame) : [],
};
function step(state: CreditsMotion, count: number) {
  for (let i = 0; i < count; i++) state.advance();
}
test('Credits592 retains the nonlinear authored fade and stop at34', () => {
  const state = new CreditsMotion(source),
    alpha = () => state.pose.children.get(1)!.placement.color!.mult[3];
  expect(alpha()).toBe(0);
  state.advance();
  expect(alpha()).toBe(15 / 256);
  step(state, 7);
  expect(alpha()).toBe(109 / 256); // Frame9, not a uniform CSS fade.
  step(state, 8);
  expect(alpha()).toBe(188 / 256);
  step(state, 16);
  expect(state.pose.frame).toBe(33);
  expect(alpha()).toBe(1);
  state.advance();
  expect(state.pose.frame).toBe(34);
  step(state, 200);
  expect(state.pose.frame).toBe(34);
});
test('Back hover switches its own shape/matrix without moving the label or restarting Credits', () => {
  const state = new CreditsMotion(source);
  step(state, 33);
  const back = state.pose.children.get(1)!.clip,
    label = back.children.get(2)!;
  expect(back.children.get(1)!.placement.matrix.tx).toBe(530);
  state.hover('back_btn', true);
  expect(back.frame).toBe(2);
  expect(back.children.get(1)!.clip.id).toBe(574);
  expect(back.children.get(1)!.placement.matrix.tx).toBe(0);
  expect(back.children.get(2)).toBe(label);
  state.hover('hero_link', true);
  state.hover('composer_link', true);
  state.hover('fb_mc', true);
  step(state, 5);
  expect(state.pose.frame).toBe(34);
  expect(back.frame).toBe(2);
  state.hover('back_btn', false);
  expect(back.frame).toBe(1);
});
test('source credit copy retains names, composer attribution, line breaks and all four hit targets', () => {
  expect(creditCopy(576)).toBe('Credits');
  expect(creditCopy(579)).toBe(
    'Jared Riley, Jason Maynard, Eric Ottati,\nLisa Jonasson, Jim Lester & Kristin Chapman',
  );
  expect(creditCopy(581)).toBe('Brian Hall\nPolyphone Music');
  expect(CREDITS.texts.find((t) => t.id === 578)!.glyphs.every((g) => g.bold)).toBe(true);
  expect(CREDITS.texts.find((t) => t.id === 581)!.glyphs.every((g) => g.bold)).toBe(true);
  expect(CREDITS.controls.map((c) => c.name)).toEqual([
    'back_btn',
    'composer_link',
    'hero_link',
    'fb_mc',
  ]);
  expect(CREDITS.controls[0].matrix.ty / 20).toBe(395.95);
});
test('historical website navigation remains an explicit replaceable offline adapter', () => {
  expect(CREDIT_WEBSITE_URLS).toEqual({
    studio: 'http://www.herointeractive.com/',
    composer: 'http://www.polyphonemusic.com/',
    social: 'http://www.facebook.com/#!/pages/Hero-Interactive/58398819916',
  });
  for (const destination of ['studio', 'composer', 'social'] as const) {
    expect(() => legacyWebsites.open(destination)).toThrow(ServiceUnavailable);
  }
});
