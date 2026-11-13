import authored from '../data/field-display.json';
import { TUTORIAL, type TutorialStage } from '../core/tutorial';
import {
  DISPLAY_IDENTITY,
  displayMatrixPoint,
  inverseDisplayMatrix,
  type DisplayMatrix,
} from '../core/display-transform';
import { RetainedTransform, type NumericPose, type PoseProperty } from '../core/retained-transform';
import type { Field, Tank, Vec } from '../core/types';

export type FieldSlot =
  | 'background'
  | 'underMask'
  | 'underEffects'
  | 'exteriorMask'
  | 'avatarUnder'
  | 'life'
  | 'actors'
  | 'detail';
const slots: Record<FieldSlot, string> = {
  background: 'BF_BG_mc',
  underMask: 'effect_mask_under',
  underEffects: 'effectLayer_under_mc',
  exteriorMask: '_-SQ',
  avatarUnder: 'avatarUnderBubble_mc',
  life: 'lifeBubbleLayer_mc',
  actors: 'enemyLayer_mc',
  detail: 'BF_over_detail_mc',
};
interface Placement {
  symbol: number;
  depth: number;
  name?: string;
  clipDepth?: number;
  matrix?: DisplayMatrix;
  color?: { mult: number[]; add: number[] };
  cacheAsBitmap?: number;
}
interface Instance {
  id: number;
  stageUpdates: number;
  symbol: number;
  depth?: number;
  name?: string;
  clipDepth?: number;
  cacheAsBitmap?: number;
  color?: Readonly<{ mult: readonly number[]; add: readonly number[] }>;
  pose: RetainedTransform;
  parent: Instance | 'world' | null;
  children: Instance[];
}
export interface FieldInstanceRead {
  readonly id: number;
  /** Attached stage updates, not a reconstructed timeline frame or RNG pose. */
  readonly stageUpdates: number;
  readonly symbol: number;
  readonly depth?: number;
  readonly name?: string;
  readonly clipDepth?: number;
  readonly cacheAsBitmap?: number;
  readonly color?: Readonly<{ mult: readonly number[]; add: readonly number[] }>;
  readonly pose: NumericPose;
  readonly parent: number | 'world' | null;
  readonly rooted: boolean;
  readonly children: readonly FieldInstanceRead[];
}
export interface AvatarSizeInput {
  readonly avatar: Tank;
  readonly details: readonly Readonly<{ x: number; y: number; radius: number }>[];
  /** TankData._-ZD(), with initial0 and ordinary sqrt (no catalog minimum10). */
  readonly radius: number;
  /** World _-G9 = _-ZD()*2, then AvatarInterface._-Q0 adds45. */
  readonly diameter: number;
  readonly requested: number;
}
export interface UnderAvatarSizeOperation {
  readonly sequence: number;
  readonly frame: number;
  readonly instance: number;
  readonly field: Field;
  readonly property: 'width' | 'height';
  readonly value: number;
  readonly input: AvatarSizeInput;
  readonly before: NumericPose;
  readonly previousUnresolved: boolean;
}
/** Called synchronously at the source setter; it must qualify geometry/setter arithmetic. */
export type UnderAvatarSizeResolver = (
  operation: UnderAvatarSizeOperation,
) =>
  | { readonly qualification: 'qualified'; readonly scaleX: number; readonly scaleY: number }
  | undefined;
export interface UnderAvatarSizeWrite extends UnderAvatarSizeOperation {
  readonly status: 'qualified' | 'unresolved';
}
interface Wrapper {
  field: Field;
  first: boolean;
  root: Instance;
  slots: Record<FieldSlot, Instance>;
  tutorial: Instance;
  tutorialStage: TutorialStage;
  tutorialFrame: number;
  bottom: Instance;
  phase: 'constructed' | 'attached' | 'orphaned' | 'detached' | 'collapsed';
  sizeWrites: UnderAvatarSizeWrite[];
  unresolvedSize: boolean;
  collapse?: { change: number; frames: number; scaleX: number; scaleY: number; active: boolean };
}
export interface FieldDisplayRead {
  readonly field: Field;
  readonly revision: number;
  readonly phase: Wrapper['phase'];
  readonly root: FieldInstanceRead;
  readonly slots: Readonly<Record<FieldSlot, FieldInstanceRead>>;
  readonly tutorial: FieldInstanceRead & {
    readonly sourceFrame: number;
    readonly stage: TutorialStage;
    readonly stopped: true;
  };
  /** Concrete117 instance, distinct from authored1540 and from effect requests. */
  readonly bottom: FieldInstanceRead;
  readonly underAvatarSizing: {
    readonly status: 'authored' | 'qualified' | 'unresolved';
    readonly writes: readonly UnderAvatarSizeWrite[];
  };
  readonly collapse?: Readonly<NonNullable<Wrapper['collapse']>>;
}
export class IncompleteFieldGeometryError extends Error {
  constructor() {
    super('Field under-avatar width/height setters have unresolved geometry');
  }
}

/** Per-Field identities and source writes only; no geometric query or inferred populations. */
export class FieldDisplays {
  private wrappers = new WeakMap<Field, Wrapper>();
  private attached = new Set<Wrapper>();
  private serial = 0;
  private revision = 0;
  private operation = 0;
  private positiveMaskLatch = false; // BTAGameWorld._-WU, survives promotion.
  private capturedUnder?: Wrapper;
  private sizeInput?: AvatarSizeInput;
  private avatar: Instance;
  private currentAvatar?: Tank;
  onWrite?: (write: { instance: number; property: PoseProperty; value: number }) => void;
  /** Parent's sibling owners can apply these source-ordered collapse writes. */
  onCollapseSiblingScale?: (
    field: Field,
    sibling: 'top' | 'bullet' | 'highlight',
    axis: 'scaleX' | 'scaleY',
    value: number,
  ) => void;
  onCollapseHighlightAlpha?: (field: Field, value: number) => void;
  constructor(private readonly resolveSize?: UnderAvatarSizeResolver) {
    this.avatar = this.instance(0, 'world');
  }
  private instance(symbol: number, parent: Instance | 'world' | null, p?: Placement): Instance {
    const id = ++this.serial;
    const instance: Instance = {
      id,
      stageUpdates: 0,
      symbol,
      parent,
      depth: p?.depth,
      name: p?.name,
      clipDepth: p?.clipDepth,
      cacheAsBitmap: p?.cacheAsBitmap,
      color: p?.color
        ? Object.freeze({
            mult: Object.freeze([...p.color.mult]),
            add: Object.freeze([...p.color.add]),
          })
        : undefined,
      pose: new RetainedTransform(
        p?.matrix ?? DISPLAY_IDENTITY,
        p?.color?.mult[3] ?? 1,
        (property, value) => {
          this.revision++;
          this.onWrite?.({ instance: id, property, value });
        },
      ),
      children: [],
    };
    for (const child of (authored.sprites as Record<string, Placement[]>)[symbol] ?? [])
      instance.children.push(this.instance(child.symbol, instance, child));
    return instance;
  }
  private wrapper(field: Field) {
    const wrapper = this.wrappers.get(field);
    if (!wrapper) throw new Error('Field wrapper has no retained display construction');
    return wrapper;
  }
  create(field: Field, first = false) {
    if (this.wrappers.has(field)) throw new Error('Field wrapper constructed twice');
    const root = this.instance(authored.symbol, null);
    const owned = Object.fromEntries(
      Object.entries(slots).map(([key, name]) => [
        key,
        root.children.find((child) => child.name === name)!,
      ]),
    ) as Record<FieldSlot, Instance>;
    const stage = (first ? 1 : (field.tutorial ?? 0)) as TutorialStage;
    const tutorial = this.instance(TUTORIAL.symbol, first ? root : owned.actors);
    (first ? root : owned.actors).children.push(tutorial);
    const bottom = this.instance(authored.bottomSymbol, null);
    this.wrappers.set(field, {
      field,
      first,
      root,
      slots: owned,
      tutorial,
      tutorialStage: stage,
      tutorialFrame: TUTORIAL.stages[stage].frame,
      bottom,
      phase: 'constructed',
      sizeWrites: [],
      unresolvedSize: false,
    });
    this.revision++;
  }
  /** AttachNewBubblefield ofs0591: four child scaleY-then-X assignments. */
  setupChildren(field: Field, scale: number) {
    const state = this.wrapper(field);
    for (const slot of ['underMask', 'exteriorMask', 'detail', 'background'] as const) {
      state.slots[slot].pose.scaleY = scale;
      state.slots[slot].pose.scaleX = scale;
    }
  }
  attach(field: Field, position: Vec) {
    const state = this.wrapper(field);
    if (state.first) {
      state.root.pose.y = position.y;
      state.root.pose.x = position.x;
    } else {
      state.root.pose.x = position.x;
      state.root.pose.y = position.y;
    }
    state.root.parent = 'world';
    state.phase = 'attached';
    this.attached.add(state);
    this.revision++;
    state.slots.exteriorMask.pose.rotation = 180;
  }
  /** _-L9 creates117 under the actual wrapper's authored1540 slot. */
  attachBottom(field: Field) {
    const state = this.wrapper(field);
    if (state.bottom.parent) throw new Error('Bottom layer already attached');
    // _-L9's first-field branch copies root X/Y; its next branch copies1540 X/Y.
    const origin = state.first ? state.root.pose : state.slots.underEffects.pose;
    state.bottom.pose.x = origin.x;
    state.bottom.pose.y = origin.y;
    state.bottom.parent = state.slots.underEffects;
    state.slots.underEffects.children.push(state.bottom);
    this.revision++;
  }
  orphan(field: Field) {
    this.wrapper(field).phase = 'orphaned';
    this.revision++;
  }
  /** _-4j removes117, then the wrapper. Authored slots retain their parents/poses. */
  detach(field: Field) {
    const state = this.wrapper(field);
    state.slots.underEffects.children = state.slots.underEffects.children.filter(
      (child) => child !== state.bottom,
    );
    state.bottom.parent = null;
    state.root.parent = null;
    state.phase = 'detached';
    this.attached.delete(state);
    this.revision++;
  }
  /** PlaceAvatar capture, not a live callback to a possibly replaced/degraded tank. */
  updateAvatar(avatar: Tank, current: Field, next: Field | undefined, frame: number) {
    if (avatar !== this.currentAvatar) {
      const old = this.avatar;
      this.avatar = this.instance(0, 'world');
      this.avatar.pose.x = old.pose.x;
      this.avatar.pose.y = old.pose.y;
      old.parent = null;
      this.currentAvatar = avatar;
      this.revision++;
    }
    const details = Object.freeze(
      avatar.design.parts.map(({ x, y, radius }) => Object.freeze({ x, y, radius })),
    );
    let radius = 0;
    for (const detail of details) {
      const x = 0 - detail.x,
        y = 0 - detail.y;
      const candidate = Math.sqrt(x * x + y * y) + detail.radius;
      if (candidate > radius) radius = candidate;
    }
    const diameter = radius * 2;
    this.sizeInput = Object.freeze({ avatar, details, radius, diameter, requested: diameter + 45 });
    this.capturedUnder = this.wrapper(current); // UpdateAvatar._-0B; NOT promotion.
    this.sizeUnderAvatar(next, frame);
  }
  /** AvatarInterface._-DF: captured reference width,height; next width,height. */
  sizeUnderAvatar(next: Field | undefined, frame: number) {
    if (!this.sizeInput) return;
    const targets = [this.capturedUnder, next ? this.wrapper(next) : undefined];
    for (const state of targets) {
      if (!state) continue;
      for (const property of ['width', 'height'] as const) {
        const operation: UnderAvatarSizeOperation = Object.freeze({
          sequence: ++this.operation,
          frame,
          field: state.field,
          instance: state.slots.avatarUnder.id,
          property,
          value: this.sizeInput.requested,
          input: this.sizeInput,
          before: state.slots.avatarUnder.pose.read(),
          previousUnresolved: state.unresolvedSize,
        });
        // A late resolver cannot silently replay over an unknown earlier setter.
        const result = state.unresolvedSize ? undefined : this.resolveSize?.(operation);
        if (result?.qualification === 'qualified') {
          state.slots.avatarUnder.pose.scaleX = result.scaleX;
          state.slots.avatarUnder.pose.scaleY = result.scaleY;
        } else state.unresolvedSize = true;
        state.sizeWrites.push(
          Object.freeze({ ...operation, status: result ? 'qualified' : 'unresolved' }),
        );
        this.revision++;
      }
    }
  }
  /** AdjustBubblefieldObjects / movement branch: each compound setter reads back its own pose. */
  moveCurrent(current: Field, delta: Vec) {
    const state = this.wrapper(current);
    state.root.pose.x = state.root.pose.x - delta.x;
    state.root.pose.y = state.root.pose.y - delta.y;
    state.slots.avatarUnder.pose.x = state.slots.avatarUnder.pose.x + delta.x;
    state.slots.avatarUnder.pose.y = state.slots.avatarUnder.pose.y + delta.y;
  }
  moveNext(current: Field, next: Field, offset: Vec, frame: number) {
    const from = this.wrapper(current),
      to = this.wrapper(next);
    // The caller currently supplies legacy separation. Complete live width/height
    // calculation is deliberately a separate integration boundary.
    to.root.pose.x = from.root.pose.x + offset.x;
    to.root.pose.y = from.root.pose.y + offset.y;
    to.slots.avatarUnder.pose.x = this.avatar.pose.x - to.root.pose.x;
    to.slots.avatarUnder.pose.y = this.avatar.pose.y - to.root.pose.y;
    this.sizeUnderAvatar(next, frame);
  }
  /** SnapBackAllObject uses the actual promoted root transform; does not rebind _-0B. */
  arrive(field: Field) {
    const state = this.wrapper(field);
    const inverse = inverseDisplayMatrix(state.root.pose.read().matrix);
    if (!inverse) throw new Error('Cannot snap under-avatar through a singular field root');
    const point = displayMatrixPoint(inverse, {
      x: this.avatar.pose.read().matrix.tx,
      y: this.avatar.pose.read().matrix.ty,
    });
    state.slots.avatarUnder.pose.x = point.x / 20;
    state.slots.avatarUnder.pose.y = point.y / 20;
    this.updateMasks(field);
  }
  /** _-Xa: next is unconditional; current writes only on the retained _-WU edge. */
  updateMasks(current: Field, next?: Field) {
    const from = this.wrapper(current);
    if (next) {
      const to = this.wrapper(next);
      to.slots.exteriorMask.pose.rotation = this.avatar.pose.x - to.root.pose.x > 0 ? 0 : 180;
    }
    const x = this.avatar.pose.x - from.root.pose.x;
    if (!this.positiveMaskLatch) {
      if (x > 0) {
        from.slots.exteriorMask.pose.rotation = 0;
        this.positiveMaskLatch = true;
        this.revision++;
      }
    } else if (x <= 0) {
      from.slots.exteriorMask.pose.rotation = 180;
      this.positiveMaskLatch = false;
      this.revision++;
    }
  }
  beginCollapse(field: Field) {
    const state = this.wrapper(field);
    state.collapse = {
      change: state.root.pose.scaleX / 204,
      frames: 0,
      scaleX: state.root.pose.scaleX,
      scaleY: state.root.pose.scaleY,
      active: true,
    };
    this.revision++;
  }
  /** _-0D.ShrinkBubblefield: X chain, then read-back root X for the Y chain. */
  shrink(field: Field, current = field) {
    const state = this.wrapper(field),
      collapse = state.collapse;
    if (!collapse?.active) return;
    // The listener's receiver and World's current layer registration can differ.
    const bottom = this.wrapper(current).bottom;
    const x = state.root.pose.scaleX - collapse.change;
    this.avatar.pose.scaleX = x;
    bottom.pose.scaleX = x;
    for (const sibling of ['top', 'bullet', 'highlight'] as const)
      this.onCollapseSiblingScale?.(current, sibling, 'scaleX', x);
    state.root.pose.scaleX = x;
    const y = state.root.pose.scaleX;
    this.avatar.pose.scaleY = y;
    bottom.pose.scaleY = y;
    for (const sibling of ['top', 'bullet', 'highlight'] as const)
      this.onCollapseSiblingScale?.(current, sibling, 'scaleY', y);
    state.root.pose.scaleY = y;
    this.avatar.pose.x = this.avatar.pose.x + collapse.change * state.root.pose.x;
    this.avatar.pose.y = this.avatar.pose.y + collapse.change * state.root.pose.y;
    collapse.frames++;
    collapse.scaleX = state.root.pose.scaleX;
    collapse.scaleY = state.root.pose.scaleY;
    this.revision++;
  }
  finishCollapse(field: Field, current = field) {
    const state = this.wrapper(field);
    if (state.collapse) state.collapse.active = false;
    // DeathAnimPart3 assigns Y then X (chained assignment), then X and Y position.
    this.avatar.pose.scaleY = 1;
    this.avatar.pose.scaleX = 1;
    this.avatar.pose.x = 0;
    this.avatar.pose.y = 0;
    state.root.pose.alpha = 0;
    this.onCollapseHighlightAlpha?.(current, 0);
    state.phase = 'collapsed';
    this.revision++;
  }
  private rooted(instance: Instance): boolean {
    return (
      instance.parent === 'world' || (instance.parent !== null && this.rooted(instance.parent))
    );
  }
  private readInstance(instance: Instance): FieldInstanceRead {
    return Object.freeze({
      id: instance.id,
      stageUpdates: instance.stageUpdates,
      symbol: instance.symbol,
      depth: instance.depth,
      name: instance.name,
      clipDepth: instance.clipDepth,
      cacheAsBitmap: instance.cacheAsBitmap,
      color: instance.color,
      pose: instance.pose.read(),
      parent: typeof instance.parent === 'object' ? (instance.parent?.id ?? null) : instance.parent,
      rooted: this.rooted(instance),
      children: Object.freeze(instance.children.map((child) => this.readInstance(child))),
    });
  }
  read(field: Field): FieldDisplayRead {
    const state = this.wrapper(field);
    return Object.freeze({
      field,
      revision: this.revision,
      phase: state.phase,
      root: this.readInstance(state.root),
      slots: Object.freeze(
        Object.fromEntries(
          Object.entries(state.slots).map(([key, slot]) => [key, this.readInstance(slot)]),
        ) as Record<FieldSlot, FieldInstanceRead>,
      ),
      tutorial: Object.freeze({
        ...this.readInstance(state.tutorial),
        sourceFrame: state.tutorialFrame,
        stage: state.tutorialStage,
        stopped: true as const,
      }),
      bottom: this.readInstance(state.bottom),
      underAvatarSizing: Object.freeze({
        status: state.unresolvedSize
          ? ('unresolved' as const)
          : state.sizeWrites.length
            ? ('qualified' as const)
            : ('authored' as const),
        writes: Object.freeze([...state.sizeWrites]),
      }),
      collapse: state.collapse ? Object.freeze({ ...state.collapse }) : undefined,
    });
  }
  /** Future complete width/hit projections must call this before traversing. */
  requireResolvedGeometry(field: Field) {
    if (this.wrapper(field).unresolvedSize) throw new IncompleteFieldGeometryError();
  }
  /** Clock notifications are mutations; read() never starts/advances a clip. */
  advanceArtwork() {
    const advance = (instance: Instance) => {
      instance.stageUpdates++;
      for (const child of instance.children) advance(child);
    };
    for (const state of this.attached) advance(state.root);
    this.avatar.stageUpdates++;
    this.revision++;
  }
  readAvatar() {
    return this.readInstance(this.avatar);
  }
  get maskLatch() {
    return this.positiveMaskLatch;
  }
}
