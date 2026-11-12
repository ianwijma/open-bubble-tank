import { describe, expect, test } from 'bun:test';
import { StageRuntime } from '../src/game/services/stage-runtime';
import { MainEffects } from '../src/game/simulation/main-effects';

describe('fixed stage-frame recipient cohorts', () => {
  test('a new menu created during a world step draws now and starts Run next frame', () => {
    const stage = new StageRuntime();
    const seen: string[] = [];
    let created = false;
    stage.subscribe({
      beforeStep: () => seen.push('world.before'),
      mainStep: () => {
        seen.push('world.step');
        if (created) return;
        created = true;
        stage.subscribe({
          beforeStep: () => seen.push('menu.before'),
          step: () => seen.push('menu.step'),
          draw: () => seen.push('menu.draw'),
        });
      },
      draw: () => seen.push('world.draw'),
    });
    stage.advance(20, 50);
    expect(seen).toEqual(['world.before', 'world.step', 'world.draw', 'menu.draw']);
    seen.length = 0;
    stage.advance(20, 50);
    expect(seen).toEqual([
      'world.before',
      'menu.before',
      'world.step',
      'menu.step',
      'world.draw',
      'menu.draw',
    ]);
  });

  test('registration in beforeStep cannot join the later step phase of that same frame', () => {
    const stage = new StageRuntime();
    const seen: string[] = [];
    let created = false;
    stage.subscribe({
      beforeStep: () => {
        seen.push('existing.before');
        if (created) return;
        created = true;
        stage.subscribe({
          beforeStep: () => seen.push('new.before'),
          step: () => seen.push('new.step'),
          draw: () => seen.push('new.draw'),
        });
      },
      step: () => seen.push('existing.step'),
    });
    stage.advance(20, 50);
    expect(seen).toEqual(['existing.before', 'existing.step', 'new.draw']);
    seen.length = 0;
    stage.advance(20, 50);
    expect(seen).toEqual([
      'existing.before',
      'new.before',
      'existing.step',
      'new.step',
      'new.draw',
    ]);
  });

  test('the cohort is fixed before the earlier Main-effects listener runs', () => {
    const seen: string[] = [];
    class RegisteringEffects extends MainEffects {
      onTick = () => {};
      override tick(random: () => number) {
        seen.push('effects');
        this.onTick();
        super.tick(random);
      }
    }
    const effects = new RegisteringEffects();
    const stage = new StageRuntime(effects);
    let created = false;
    effects.onTick = () => {
      if (created) return;
      created = true;
      stage.subscribe({
        beforeStep: () => seen.push('new.before'),
        step: () => seen.push('new.step'),
      });
    };
    stage.subscribe({
      beforeStep: () => seen.push('existing.before'),
      step: () => seen.push('existing.step'),
    });
    stage.advance(20, 50);
    expect(seen).toEqual(['effects', 'existing.before', 'existing.step']);
    seen.length = 0;
    stage.advance(20, 50);
    expect(seen).toEqual(['effects', 'existing.before', 'new.before', 'existing.step', 'new.step']);
  });

  test('removal before a recipient turn suppresses its pending hooks and drawing', () => {
    const stage = new StageRuntime();
    const seen: string[] = [];
    let remove = () => {};
    stage.subscribe({
      beforeStep: () => {
        seen.push('owner.before');
        remove();
      },
      step: () => seen.push('owner.step'),
      draw: () => seen.push('owner.draw'),
    });
    remove = stage.subscribe({
      beforeStep: () => seen.push('removed.before'),
      step: () => seen.push('removed.step'),
      draw: () => seen.push('removed.draw'),
    });
    stage.advance(20, 50);
    expect(seen).toEqual(['owner.before', 'owner.step', 'owner.draw']);
    remove();
    stage.advance(20, 50);
    expect(seen).toEqual([
      'owner.before',
      'owner.step',
      'owner.draw',
      'owner.before',
      'owner.step',
      'owner.draw',
    ]);
  });

  test('removal between phases suppresses step even after beforeStep already ran', () => {
    const stage = new StageRuntime();
    const seen: string[] = [];
    let remove = () => {};
    stage.subscribe({
      beforeStep: () => seen.push('owner.before'),
      mainStep: () => {
        seen.push('owner.step');
        remove();
      },
    });
    remove = stage.subscribe({
      beforeStep: () => seen.push('removed.before'),
      step: () => seen.push('removed.step'),
      draw: () => seen.push('removed.draw'),
    });
    stage.advance(20, 50);
    expect(seen).toEqual(['owner.before', 'removed.before', 'owner.step']);
  });

  test('a listener that removes itself in beforeStep does not receive its step hook', () => {
    const stage = new StageRuntime();
    const seen: string[] = [];
    let remove = () => {};
    remove = stage.subscribe({
      beforeStep: () => {
        seen.push('self.before');
        remove();
      },
      mainStep: () => seen.push('self.main'),
      step: () => seen.push('self.step'),
      draw: () => seen.push('self.draw'),
    });
    stage.advance(40, 50);
    expect(seen).toEqual(['self.before']);
  });

  test('a new menu joins the next logical catch-up frame without waiting for another RAF', () => {
    const stage = new StageRuntime();
    const seen: [string, number][] = [];
    let frame = 0;
    stage.subscribe({
      beforeStep: () => {
        frame++;
        seen.push(['world.before', frame]);
      },
      mainStep: () => {
        seen.push(['world.step', frame]);
        if (frame !== 1) return;
        stage.subscribe({
          beforeStep: () => seen.push(['menu.before', frame]),
          step: () => seen.push(['menu.step', frame]),
          draw: () => seen.push(['menu.draw', frame]),
        });
      },
      draw: () => seen.push(['world.draw', frame]),
    });
    stage.advance(60, 50);
    expect(seen).toEqual([
      ['world.before', 1],
      ['world.step', 1],
      ['world.before', 2],
      ['menu.before', 2],
      ['world.step', 2],
      ['menu.step', 2],
      ['world.before', 3],
      ['menu.before', 3],
      ['world.step', 3],
      ['menu.step', 3],
      ['world.draw', 3],
      ['menu.draw', 3],
    ]);
  });

  test('wall-time callbacks before a logical frame can register its initial recipients', () => {
    const stage = new StageRuntime();
    const seen: string[] = [];
    let created = false;
    stage.subscribe({
      elapsed: () => {
        seen.push('elapsed');
        if (created) return;
        created = true;
        stage.subscribe({
          beforeStep: () => seen.push('new.before'),
          step: () => seen.push('new.step'),
        });
      },
    });
    stage.advance(20, 50);
    expect(seen).toEqual(['elapsed', 'new.before', 'new.step']);
  });

  test('current drawing still includes subscriptions created during the render pass', () => {
    const stage = new StageRuntime();
    const seen: string[] = [];
    let created = false;
    stage.subscribe({
      draw: () => {
        seen.push('existing.draw');
        if (created) return;
        created = true;
        stage.subscribe({
          beforeStep: () => seen.push('new.before'),
          step: () => seen.push('new.step'),
          draw: () => seen.push('new.draw'),
        });
      },
    });
    stage.advance(0, 50);
    expect(seen).toEqual(['existing.draw', 'new.draw']);
    seen.length = 0;
    stage.advance(20, 50);
    expect(seen).toEqual(['new.before', 'new.step', 'existing.draw', 'new.draw']);
  });

  test('an upgrade finish callback after the world listener resumes it on the following frame', () => {
    const stage = new StageRuntime();
    const seen: string[] = [];
    let stopped = true;
    let removeMenu = () => {};
    stage.subscribe({ mainStep: () => seen.push(stopped ? 'world.stopped' : 'world.running') });
    removeMenu = stage.subscribe({
      step: () => {
        seen.push('menu.finish');
        stopped = false;
        removeMenu();
      },
    });
    stage.advance(40, 50);
    expect(seen).toEqual(['world.stopped', 'menu.finish', 'world.running']);
  });
});
