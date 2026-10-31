'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { AssetPack } from '@/game/assets/asset-pack';
import type { Profile, Settings, TankDesign } from '@/game/core/types';
import { STARTER } from '@/game/data/catalog';
import { World } from '@/game/simulation/world';
import { AudioManager } from '@/game/services/audio';
import { StageRuntime } from '@/game/services/stage-runtime';
import { loadProfile, saveProfile, saveCreatedTank } from '@/game/services/profile';
import { AssetGate } from './asset-gate';
import { GameViewport } from './game-viewport';
import { MainStage } from './main-stage';
import { GameHud } from './game-hud';
import { SettingsPanel } from './settings-panel';
import { TankCreator } from './tank-creator';
import { TankLibrary } from './tank-library';
import { UpgradePanel, EditConfirmPanel, SecondaryHelpPanel } from './game-panels';
import { PausePanel } from './pause-panel';
import { WinPanel } from './win-panel';
import { BubbleText, Dialog, Icon } from './ui';

type Screen = 'menu' | 'game' | 'creator' | 'library';
type Overlay = 'settings' | 'credits' | 'sources' | 'edit-confirm' | 'edit-choice' | null;
interface EditorContext {
  initial: TankDesign;
  returnTo: Screen;
  upgrade: boolean;
}
export default function GameShell() {
  const [pack, setPack] = useState<AssetPack | null>(null),
    [profile, setProfile] = useState<Profile | null>(null),
    [screen, setScreen] = useState<Screen>('menu'),
    [overlay, setOverlay] = useState<Overlay>(null),
    [world, setWorld] = useState<World | null>(null),
    [, setRevision] = useState(0),
    [localSources, setLocalSources] = useState(false),
    [continueRun, setContinueRun] = useState(false),
    [editor, setEditor] = useState<EditorContext | null>(null),
    [storageError, setStorageError] = useState(false),
    [nativeSize, setNativeSize] = useState(false),
    [fullscreen, setFullscreen] = useState(false),
    [audio, setAudio] = useState<AudioManager | null>(null);
  const [stage] = useState(() => new StageRuntime());
  const frame = useRef<HTMLDivElement>(null),
    space = useRef<HTMLDivElement>(null),
    startingWorld = useRef<World | null>(null);
  const refresh = useCallback(() => setRevision((r) => r + 1), []);
  useEffect(() => {
    setProfile(loadProfile());
  }, []);
  useEffect(() => {
    let wasFullscreen = document.fullscreenElement === frame.current;
    const changed = () => {
      const active = document.fullscreenElement === frame.current;
      setFullscreen(active);
      // Browsers can consume Escape before page key handlers when leaving fullscreen.
      if (wasFullscreen && !active) {
        world?.pause();
        refresh();
      }
      wasFullscreen = active;
    };
    document.addEventListener('fullscreenchange', changed);
    return () => document.removeEventListener('fullscreenchange', changed);
  }, [world, refresh]);
  useEffect(() => {
    const el = frame.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      if (!space.current) return;
      const rect = entries[0].contentRect,
        full = document.fullscreenElement === el;
      const scale = full ? Math.min(rect.width / 550, rect.height / 450) : rect.width / 550;
      space.current.style.transform = `scale(${scale})`;
      space.current.style.left = full ? `${(rect.width - 550 * scale) / 2}px` : '0';
      space.current.style.top = full ? `${(rect.height - 450 * scale) / 2}px` : '0';
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!pack) {
      setAudio(null);
      return;
    }
    const manager = new AudioManager(pack);
    setAudio(manager);
    return () => {
      manager.dispose();
    };
  }, [pack]);
  useEffect(() => {
    if (profile) {
      audio?.setFrameRate(profile.settings.fps);
      audio?.setMusic(
        screen === 'game' || (screen === 'creator' && editor?.returnTo === 'game')
          ? 'game'
          : 'menu',
        profile.settings.music,
      );
      audio?.setSound(profile.settings.sound);
    }
  }, [screen, profile, pack, editor, audio]);
  useEffect(() => () => pack?.dispose(), [pack]);
  function updateProfile(update: (p: Profile) => Profile) {
    setProfile((previous) => {
      if (!previous) return previous;
      const next = update(previous);
      setStorageError(!saveProfile(next));
      return next;
    });
  }
  function settingsChange(settings: Settings, control?: 'shake' | 'efficiency') {
    // Pause's standalone toggle only gates Massive Cannon. Menu and efficiency
    // controls also call the source controller's enable/disable methods.
    if (control === 'efficiency' || (control === 'shake' && screen === 'menu'))
      stage.effects.setEnabled(settings.shake);
    updateProfile((p) => ({ ...p, settings }));
  }
  function startRun() {
    if (!profile) return;
    const next = new World(
      localSources ? profile.tanks.filter((t) => !t.avatar) : [],
      continueRun ? profile.progression : [],
      undefined,
      stage.effects,
    );
    const random = next.rng;
    stage.random = () => random.next();
    next.screenShake = profile.settings.shake;
    startingWorld.current = next;
    next.secondaryHelpSeen = profile.secondaryHelpSeen;
    next.onSecondaryHelp = () => updateProfile((p) => ({ ...p, secondaryHelpSeen: true }));
    next.onProgression = (history) => updateProfile((p) => ({ ...p, progression: history }));
    next.onAchievement = (name) =>
      updateProfile((p) => ({ ...p, achievements: [...new Set([...p.achievements, name])] }));
    setWorld(next);
    setScreen('game');
    setOverlay(null);
  }
  function menu() {
    world?.pause();
    setScreen('menu');
    setOverlay(null);
  }
  function edit(initial: TankDesign, upgrade = false) {
    world?.pause();
    setEditor({ initial, returnTo: screen, upgrade });
    setScreen('creator');
    setOverlay(null);
  }
  function saveTank(design: TankDesign) {
    if (!profile || !editor) return;
    const saved = saveCreatedTank(profile, design),
      tank = saved.tank;
    updateProfile(() => saved.profile);

    if (editor.returnTo === 'game' && world) {
      if (editor.upgrade) world.selectUpgrade(tank);
      else world.editPlayer(tank);
      world.resume();
    }
    setScreen(editor.returnTo);
    setEditor(null);
    refresh();
  }
  function exitEditor() {
    if (editor) {
      setScreen(editor.returnTo);
      setEditor(null);
      if (editor.returnTo === 'game' && !editor.upgrade) world?.resume();
    }
  }
  function closeOverlay() {
    setOverlay(null);
  }
  const settings = profile?.settings;
  return (
    <main
      className="site-shell"
      onPointerDownCapture={() => audio?.unlock()}
      onKeyDownCapture={() => audio?.unlock()}
    >
      <header className="site-header">
        <a className="project-name" href="/" aria-label="Open Bubble Tank home">
          <span className="brand-bubbles" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          OPEN BUBBLE TANK
        </a>
        <span className="header-caption">A FLASH CLASSIC, REBUILT</span>
        <div className="window-actions">
          <button
            aria-label={nativeSize ? 'Enlarge game' : 'Original game size'}
            title="Toggle original size"
            onClick={() => setNativeSize(!nativeSize)}
          >
            {nativeSize ? 'FIT' : '1×'}
          </button>
          <button
            aria-label={fullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            title="Fullscreen"
            onClick={() =>
              void (fullscreen ? document.exitFullscreen() : frame.current?.requestFullscreen())
            }
          >
            <Icon name="fullscreen" size={15} />
          </button>
        </div>
      </header>
      <div ref={frame} className={`stage-frame ${nativeSize ? 'native-size' : ''}`}>
        <div ref={space} className="stage-space">
          <MainStage runtime={stage} fps={profile?.settings.fps ?? 50}>
            {!pack ? (
              <AssetGate
                onReady={(p) => {
                  setPack(p);
                  setScreen('menu');
                }}
              />
            ) : null}
            {pack && profile && screen === 'menu' ? (
              <div className="main-menu stage-background">
                <div className="menu-guest">
                  <span aria-hidden="true">×</span> Playing as Guest
                </div>
                <span className="menu-version">OPEN · 0.1</span>
                <div className="ambient-bubbles" aria-hidden="true">
                  <i />
                  <i />
                  <i />
                </div>
                {pack.extras.get(545) ? (
                  <img
                    className="original-title"
                    style={{
                      left: 55.3 + pack.extras.get(545)!.x,
                      top: 176.35 + pack.extras.get(545)!.y,
                      width: pack.extras.get(545)!.width,
                    }}
                    src={pack.extras.get(545)!.url}
                    alt="Bubble Tanks 3"
                  />
                ) : (
                  <div className="menu-title">
                    <BubbleText pack={pack} size={57}>
                      bubble tanks 3
                    </BubbleText>
                  </div>
                )}
                <button
                  className="menu-orb menu-play"
                  aria-label="Play"
                  onClick={() => {
                    setContinueRun(false);
                    setOverlay('sources');
                  }}
                >
                  <MenuArt pack={pack} symbol={492} icon="play" size={78} />
                  <span className="orb-caption">PLAY</span>
                </button>
                <button
                  className="menu-orb menu-create"
                  aria-label="Enemy tank creator"
                  onClick={() =>
                    edit({
                      ...STARTER,
                      id: 'new',
                      name: 'My Enemy Tank',
                      avatar: false,
                      life: 1,
                      reward: 1,
                      speed: 1,
                      parts: [],
                    })
                  }
                >
                  <MenuArt pack={pack} symbol={500} icon="library" size={26} />
                  <span className="orb-caption">CREATE A TANK</span>
                </button>
                <button
                  className="menu-orb menu-library"
                  aria-label="My tanks"
                  onClick={() => setScreen('library')}
                >
                  <MenuArt pack={pack} symbol={496} icon="plus" size={28} />
                  <span className="orb-caption">MY TANKS</span>
                </button>
                <button
                  className="menu-orb menu-settings"
                  aria-label="Settings"
                  onClick={() => setOverlay('settings')}
                >
                  <MenuArt pack={pack} symbol={494} icon="settings" size={21} />
                  <span className="orb-caption">SETTINGS</span>
                </button>
                <button
                  className="menu-orb menu-credits"
                  aria-label="Credits"
                  onClick={() => setOverlay('credits')}
                >
                  <MenuArt pack={pack} symbol={498} icon="file" size={21} />
                  <span className="orb-caption">CREDITS</span>
                </button>
                <button
                  className="menu-orb menu-assets"
                  aria-label="Change assets"
                  onClick={() => {
                    setWorld(null);
                    setPack(null);
                  }}
                >
                  <Icon name="back" size={20} />
                  <span className="orb-caption">CHANGE ASSETS</span>
                </button>
                <span className="menu-bottom-left">
                  {pack.mode === 'swf' ? 'Original assets loaded' : 'Mock asset mode'}
                </span>
                <span className="menu-bottom-right">All progress saved locally</span>
              </div>
            ) : null}
            {pack &&
            profile &&
            (screen === 'game' || (screen === 'creator' && editor?.returnTo === 'game')) &&
            world ? (
              <>
                <GameViewport
                  world={world}
                  pack={pack}
                  settings={profile.settings}
                  audio={audio}
                  stage={stage}
                  onChange={refresh}
                  onReady={() => {
                    if (startingWorld.current !== world) return;
                    startingWorld.current = null;
                    stage.effects.flash();
                  }}
                />
                <GameHud
                  world={world}
                  onMap={() => {
                    world.cycleMap();
                    refresh();
                  }}
                  onPause={() => {
                    world.pause();
                    refresh();
                  }}
                  onEdit={() => {
                    if (!world.canEdit) return;
                    world.pause();
                    setOverlay('edit-confirm');
                    refresh();
                  }}
                />
                {screen === 'game' &&
                world.mode === 'paused' &&
                (overlay === null || overlay === 'settings') ? (
                  <PausePanel
                    pack={pack}
                    closeKey={profile.settings.h5}
                    onResume={() => {
                      world.resume();
                      refresh();
                    }}
                    onSettings={() => setOverlay('settings')}
                    tank={world.player}
                    stage={stage}
                    fps={profile.settings.fps}
                    covered={overlay === 'settings'}
                    onMenu={menu}
                  />
                ) : null}
                {screen === 'game' && world.mode === 'upgrade' ? (
                  <UpgradePanel
                    pack={pack}
                    offers={world.offers}
                    current={world.player.design}
                    onSelect={(tank) => {
                      world.selectUpgrade(tank);
                      refresh();
                    }}
                    onEdit={(tank) => edit(tank, true)}
                  />
                ) : null}
                {screen === 'game' && world.mode === 'secondary-help' ? (
                  <SecondaryHelpPanel
                    pack={pack}
                    onClose={() => {
                      world.closeSecondaryHelp();
                      refresh();
                    }}
                  />
                ) : null}
                {screen === 'game' && overlay === 'edit-confirm' ? (
                  <EditConfirmPanel
                    pack={pack}
                    onYes={() => {
                      world.offers = world.getOffers();
                      setOverlay('edit-choice');
                    }}
                    onNo={() => {
                      world.resume();
                      setOverlay(null);
                      refresh();
                    }}
                  />
                ) : null}
                {screen === 'game' && overlay === 'edit-choice' ? (
                  <UpgradePanel
                    pack={pack}
                    offers={world.offers}
                    current={world.player.design}
                    onSelect={(tank) => {
                      world.editPlayer(tank);
                      world.resume();
                      setOverlay(null);
                      refresh();
                    }}
                    onEdit={(tank) => edit(tank)}
                  />
                ) : null}
                {screen === 'game' && world.mode === 'won' ? (
                  <WinPanel
                    pack={pack}
                    fps={profile.settings.fps}
                    onMenu={menu}
                    onContinue={() => {
                      world.mode = 'playing';
                      refresh();
                    }}
                  />
                ) : null}
              </>
            ) : null}
            {pack && profile && screen === 'creator' && editor ? (
              <TankCreator
                key={editor.initial.id}
                pack={pack}
                fps={profile.settings.fps}
                overGame={editor.returnTo === 'game'}
                initial={editor.initial}
                level={editor.returnTo === 'game' ? (world?.progression.level ?? 1) : 6}
                maxClass={
                  editor.returnTo === 'game' ? Math.min(6, (world?.progression.level ?? 0) + 1) : 6
                }
                onSave={saveTank}
                onExit={exitEditor}
              />
            ) : null}
            {pack && profile && screen === 'library' ? (
              <TankLibrary
                pack={pack}
                tanks={profile.tanks}
                onBack={() => setScreen('menu')}
                onEdit={(t) => edit(t)}
                onImport={(tank) =>
                  updateProfile((p) => ({
                    ...p,
                    tanks: [...p.tanks.filter((t) => t.id !== tank.id), tank],
                  }))
                }
                onDelete={(id) =>
                  updateProfile((p) => ({ ...p, tanks: p.tanks.filter((t) => t.id !== id) }))
                }
              />
            ) : null}
            {pack && settings && overlay === 'settings' ? (
              <SettingsPanel
                overPause={screen === 'game' && world?.mode === 'paused'}
                pack={pack}
                settings={settings}
                onChange={settingsChange}
                onClose={closeOverlay}
              />
            ) : null}
            {pack && overlay === 'credits' ? (
              <Dialog title="Bubble Tanks 3" onClose={closeOverlay}>
                <div className="credits">
                  <p>
                    Original game, artwork, and sound
                    <br />
                    <strong>Hero Interactive</strong>
                  </p>
                  <p>
                    Open Bubble Tank is an independent TypeScript recreation, built from research
                    into the original Flash game.
                  </p>
                  <p>
                    Game assets are supplied by you and extracted locally. The Flash file is never
                    uploaded or executed.
                  </p>
                  {pack.report ? (
                    <p className="asset-summary">
                      {pack.report.filename}
                      <br />
                      {pack.report.vectors.toLocaleString()} vectors ·{' '}
                      {pack.report.sprites.toLocaleString()} sprites · {pack.report.sounds} sounds
                    </p>
                  ) : (
                    <p className="asset-summary">Playing with procedural mock artwork.</p>
                  )}
                </div>
                <button className="game-button" onClick={closeOverlay}>
                  BACK
                </button>
              </Dialog>
            ) : null}
            {pack && profile && overlay === 'sources' ? (
              <Dialog title="Choose your tanks" onClose={closeOverlay}>
                <p className="source-intro">
                  Explore an endless world of bubblefields with the original built-in tank
                  collection.
                </p>
                <label className="source-option">
                  <input type="checkbox" checked readOnly /> Hero Interactive tanks{' '}
                  <span>43 built-in enemies</span>
                </label>
                <label className="source-option">
                  <input
                    type="checkbox"
                    checked={localSources}
                    disabled={!profile.tanks.some((t) => !t.avatar)}
                    onChange={(e) => setLocalSources(e.target.checked)}
                  />{' '}
                  My enemy tanks <span>{profile.tanks.filter((t) => !t.avatar).length} saved</span>
                </label>
                <label className="source-option continue-option">
                  <input
                    type="checkbox"
                    checked={continueRun}
                    disabled={!profile.progression.length}
                    onChange={(e) => setContinueRun(e.target.checked)}
                  />{' '}
                  Use saved avatars from previous game
                </label>
                <div className="dialog-actions">
                  <span className="small-note">Everything plays offline.</span>
                  <button className="game-button primary" onClick={startRun}>
                    PLAY <span aria-hidden="true">→</span>
                  </button>
                </div>
              </Dialog>
            ) : null}
          </MainStage>
        </div>
      </div>
      <footer className="site-footer">
        <span>
          {pack
            ? pack.mode === 'swf'
              ? 'ORIGINAL SWF ASSETS'
              : 'PROCEDURAL MOCK ASSETS'
            : 'YOUR SWF · YOUR DEVICE'}
        </span>
        <p>
          <kbd>W</kbd>
          <kbd>A</kbd>
          <kbd>S</kbd>
          <kbd>D</kbd> move <b>·</b> mouse aim & fire <b>·</b> <kbd>SPACE</kbd> secondary <b>·</b>{' '}
          <kbd>P</kbd> / <kbd>ESC</kbd> pause
        </p>
        <span>{storageError ? 'LOCAL SAVING UNAVAILABLE' : 'LOCAL SAVE'}</span>
      </footer>
    </main>
  );
}
function MenuArt({
  pack,
  symbol,
  icon,
  size,
}: {
  pack: AssetPack;
  symbol: number;
  icon: React.ComponentProps<typeof Icon>['name'];
  size: number;
}) {
  const raster = pack.extras.get(symbol);
  return raster ? (
    <img className="menu-original-art" src={raster.url} alt="" />
  ) : (
    <Icon name={icon} size={size} />
  );
}
