'use client';
import { useEffect, useRef, useState } from 'react';
import type { AssetPack } from '@/game/assets/asset-pack';
import type { TankDesign } from '@/game/core/types';
import {
  acceptsCreatorNameInput,
  acceptsCreatorNameEdit,
  creatorDialogFrame,
  EMPTY_CREATOR_SUBMISSION,
  type CreatorDialogButton,
  type CreatorDialogFrame,
} from '@/game/core/creator-dialogs';
import { community } from '@/game/services/extensions';
import { encodeTankCode } from '@/game/services/tank-code';
import { CreatorRasterArt, CreatorPrimitives } from './creator-controls';
import { CreatorText } from './creator-text';
function ScreenButton({
  pack,
  piece,
  label,
  disabled,
  onClick,
}: {
  pack: AssetPack;
  piece: CreatorDialogButton;
  label: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  const [state, setState] = useState<'up' | 'over' | 'down'>('up');
  const b = piece.bounds,
    m = piece.matrix,
    raster = pack.creatorFrames.get(`dialog:${piece.symbol}:${state}`);
  return (
    <button
      className="creator-dialog-button"
      aria-label={label}
      disabled={disabled}
      style={{
        left: m.tx / 20,
        top: m.ty / 20,
        width: b.width,
        height: b.height,
        transform: `matrix(${m.a},${m.b},${m.c},${m.d},0,0) translate(${b.x}px,${b.y}px)`,
        transformOrigin: '0 0',
      }}
      onPointerEnter={() => setState('over')}
      onPointerLeave={() => setState('up')}
      onPointerDown={(e) => {
        if (e.button === 0) setState('down');
      }}
      onPointerUp={(e) => {
        if (e.button === 0) setState('over');
      }}
      onPointerCancel={() => setState('up')}
      onFocus={() => setState('over')}
      onBlur={() => setState('up')}
      onClick={onClick}
    >
      {raster ? (
        <CreatorRasterArt raster={raster} offsetX={-b.x} offsetY={-b.y} />
      ) : (
        <svg
          aria-hidden="true"
          viewBox={`${b.x} ${b.y} ${b.width} ${b.height}`}
          width={b.width}
          height={b.height}
        >
          <CreatorPrimitives pieces={piece.variants[state]} />
        </svg>
      )}
      {piece.fields[state].map((field) => (
        <CreatorText
          key={field.name}
          pack={pack}
          field={field}
          text={field.initialText ?? ''}
          x={field.x - b.x}
          y={field.y - b.y}
        />
      ))}
    </button>
  );
}
/** TankScreens1070: source exit/name/code/error poses over the still-live editor. */
export function CreatorSaveDialog({
  pack,
  kind,
  tank,
  opener,
  authorName = 'BubbleTanks3',
  onSave,
  onClose,
  onExit,
}: {
  pack: AssetPack;
  kind: 'save' | 'exit';
  tank: TankDesign;
  opener: HTMLElement | null;
  authorName?: string;
  onSave: (tank: TankDesign) => TankDesign | undefined;
  onClose: () => void;
  onExit: () => void;
}) {
  const [frame, setFrame] = useState<CreatorDialogFrame>(kind === 'save' ? 2 : 1),
    [author, setAuthor] = useState(authorName),
    [name, setName] = useState(tank.name),
    [saved, setSaved] = useState<TankDesign | null>(null),
    [code, setCode] = useState(''),
    [error, setError] = useState(''),
    [status, setStatus] = useState(''),
    [busy, setBusy] = useState(false);
  const root = useRef<HTMLDivElement>(null),
    mounted = useRef(true);
  useEffect(() => {
    root.current?.focus();
  }, [frame]);
  useEffect(() => {
    mounted.current = true;
    const previous = opener;
    root.current?.focus();
    return () => {
      mounted.current = false;
      previous?.focus({ preventScroll: true });
    };
  }, [opener]);
  useEffect(() => {
    if (!saved) return;
    let cancelled = false;
    // _-VM exports a freshly constructed TankData with difficulty1; local ImportTankData recalculates it.
    void encodeTankCode({ ...saved, difficulty: 1 })
      .then((value) => {
        if (!cancelled) setCode(value);
      })
      .catch((e) => {
        if (!cancelled) setStatus(e instanceof Error ? e.message : 'Unable to encode this tank.');
      });
    return () => {
      cancelled = true;
    };
  }, [saved]);
  const screen = creatorDialogFrame(frame),
    raster = pack.creatorFrames.get(`dialog:${frame}`);
  const fieldValue = (key: string, initial = '') =>
    key === 'author_txt'
      ? author
      : key === 'tank_txt'
        ? name
        : key === 'data_txt'
          ? code
          : key === 'message_txt'
            ? error
            : initial;
  function submit() {
    const result = onSave({ ...tank, author, name });
    if (!result) {
      setError(EMPTY_CREATOR_SUBMISSION);
      setFrame(7);
      return;
    }
    setSaved(result);
    setFrame(3);
  }
  async function action(key: string) {
    if (key === 'cancel_btn' || key === 'return_btn') {
      onClose();
      return;
    }
    if (key === 'exit_btn') {
      onExit();
      return;
    }
    if (key === 'continue_btn') {
      submit();
      return;
    }
    if (key === 'Copy_btn') {
      try {
        await navigator.clipboard.writeText(code);
        if (mounted.current) setStatus('Tank code copied.');
      } catch {
        if (mounted.current) setStatus('Select and copy the code from the box.');
      }
    }
    if (key === 'share_btn' && saved) {
      setBusy(true);
      try {
        await community.publish(saved);
      } catch (e) {
        if (mounted.current) {
          setError(e instanceof Error ? e.message : 'Community tank sharing is not connected.');
          setFrame(7);
        }
      } finally {
        if (mounted.current) setBusy(false);
      }
    }
  }
  const title =
    frame === 1
      ? 'Exit tank creator?'
      : frame === 2
        ? 'Save your tank'
        : frame === 3
          ? 'Tank saved'
          : 'Tank submission error';
  return (
    <div
      ref={root}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="creator-save-dialog"
      data-dialog-frame={frame}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === 'Escape') {
          e.preventDefault();
          onClose();
        }
        if (e.key === 'Tab') {
          const targets = Array.from(
            root.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input,textarea') ??
              [],
          );
          const first = targets[0],
            last = targets.at(-1);
          if (
            e.shiftKey &&
            (document.activeElement === first || document.activeElement === root.current)
          ) {
            e.preventDefault();
            last?.focus();
          } else if (
            !e.shiftKey &&
            (document.activeElement === last || document.activeElement === root.current)
          ) {
            e.preventDefault();
            first?.focus();
          }
        }
      }}
    >
      {raster ? (
        <CreatorRasterArt raster={raster} />
      ) : (
        <svg aria-hidden="true" width={550} height={450}>
          <CreatorPrimitives pieces={screen.art} />
        </svg>
      )}
      {screen.fields.map((field) => {
        const text = fieldValue(field.name, field.initialText);
        if (field.name === 'data_txt')
          return (
            <textarea
              key={field.name}
              className="creator-dialog-code"
              aria-label="Saved tank code"
              spellCheck={false}
              readOnly
              value={code}
              style={{
                left: field.x,
                top: field.y,
                width: field.width,
                height: field.height,
                fontSize: field.size,
                lineHeight: `${field.lineHeight}px`,
              }}
              onClick={(e) => e.currentTarget.select()}
            />
          );
        if (field.name === 'author_txt' || field.name === 'tank_txt')
          return (
            <div key={field.name}>
              <CreatorText pack={pack} field={field} text={text} />
              <input
                className="creator-dialog-input"
                aria-label={field.name === 'author_txt' ? 'Author name' : 'Tank name'}
                maxLength={field.maxLength}
                value={text}
                style={{
                  left: field.x,
                  top: field.y,
                  width: field.width,
                  height: field.height,
                  fontSize: field.size,
                }}
                onBeforeInput={(e) => {
                  const data = (e.nativeEvent as InputEvent).data;
                  if (data && !acceptsCreatorNameInput(data)) e.preventDefault();
                }}
                onPaste={(e) => {
                  if (!acceptsCreatorNameInput(e.clipboardData.getData('text'))) e.preventDefault();
                }}
                onChange={(e) => {
                  if (acceptsCreatorNameEdit(text, e.target.value))
                    (field.name === 'author_txt' ? setAuthor : setName)(e.target.value);
                }}
                onFocus={() => {
                  if (field.name === 'author_txt' && author === 'Type your name...') setAuthor('');
                }}
                onBlur={() => {
                  if (field.name === 'author_txt' && author === '') setAuthor('Type your name...');
                }}
              />
            </div>
          );
        return <CreatorText key={field.name} pack={pack} field={field} text={text} />;
      })}
      {screen.buttons.map((piece) => (
        <ScreenButton
          key={`${frame}:${piece.name}`}
          pack={pack}
          piece={piece}
          label={
            (
              {
                cancel_btn: 'Cancel',
                exit_btn: frame === 1 ? 'Exit without saving' : 'Exit creator',
                continue_btn: 'Continue',
                return_btn: 'Return to editing',
                share_btn: 'Share tank online',
                Copy_btn: 'Copy tank code',
              } as Record<string, string>
            )[piece.name]
          }
          disabled={busy || (piece.name === 'Copy_btn' && !code)}
          onClick={() => void action(piece.name)}
        />
      ))}
      <p className="creator-dialog-status" role="status">
        {status}
      </p>
    </div>
  );
}
