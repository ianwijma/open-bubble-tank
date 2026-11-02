import { expect, test } from 'bun:test';
import { PARTS, partById } from '../src/game/data/catalog';

test('part descriptions retain original damage, special and behavior labels', () => {
  expect(PARTS).toHaveLength(93);
  expect(PARTS.filter((part) => part.id < 2000).every((part) => part.damageText === '')).toBe(true);
  expect(PARTS.filter((part) => part.id >= 2000).every((part) => part.damageText.length > 0)).toBe(
    true,
  );
  for (const [id, text] of [
    [2001, 'Damage: 1'],
    [2012, 'Special: Deflects enemy bullets.'],
    [3008, 'Damage: 100'],
    [4013, 'Damage: 2 per Drone (6 Drones)'],
    [4018, "Special: Inks player's screen"],
    [4032, 'Special: Builds Shield Generators'],
    [6002, 'Behavior: Heals other enemies'],
  ] as const)
    expect(partById(id)?.damageText).toBe(text);
});

test('part prose decodes source quote escapes once and preserves authored wording', () => {
  expect(partById(4013)?.flavor).toBe(
    'We\'ve always wondered what sort of dark little secrets were inside of those big yellow bubbles. "Shoot it.  You know you want to." says the Carrier.',
  );
  expect(partById(2006)?.flavor).toBe(
    'The 2 Parallel is an awesome weapon with its 2 focused bullets.  Honestly, what CAN\'T it do? "Fire 3 bullets," says 3 Parallel.',
  );
  expect(partById(4032)?.flavor).toBe('"Haha, you can\'t hurt- HEY! DON\'T TOUCH THAT!!"');
  expect(partById(1001)?.flavor).toBe(
    "Small Bubble knows he's small, but that doesn't make him any less important.",
  );
  expect(partById(4018)?.shortName).toBe("IG's");
});
