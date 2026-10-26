import { createRoot } from 'react-dom/client';
import { WinPanel } from '../../src/components/win-panel';
import type { AssetPack } from '../../src/game/assets/asset-pack';

/** Mount real screen components without shipping a fixture route in the game. */
export function showWinScreen(
  pack: AssetPack,
  stage: HTMLElement,
  onAction: (action: string) => void,
) {
  const root = createRoot(stage);
  root.render(
    <WinPanel
      pack={pack}
      onContinue={() => onAction('continue')}
      onMenu={() => onAction('menu')}
    />,
  );
  return () => root.unmount();
}
