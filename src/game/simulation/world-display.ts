import { STAGE } from '../core/constants';
import {
  DISPLAY_IDENTITY,
  displayMatrixPoint,
  displayMatrixProduct,
  type DisplayMatrix,
} from '../core/display-transform';
import { displayTwips } from '../core/display-values';
import { RetainedTransform, type NumericPose } from '../core/retained-transform';
import type { Field, Vec } from '../core/types';
import type { FieldDisplays, FieldSlot } from './field-display';
import type { EffectLayer, RegisteredEffects } from './registered-effects';

export type WorldLayerKind = 'bullet' | 'top' | 'highlight' | 'screen';
interface Instance {
  readonly identity: object;
  readonly symbol: number | null;
  readonly pose: RetainedTransform;
  attached: boolean;
  readonly effectLayer?: EffectLayer;
}
export interface WorldLayerRead {
  readonly identity: object;
  readonly symbol: number | null;
  readonly kind: WorldLayerKind;
  readonly pose: NumericPose;
  readonly parent: 'world' | null;
  readonly rooted: boolean;
}
interface Layers {
  readonly bullet: Instance;
  readonly top: Instance;
  readonly highlight: Instance;
}

/** World siblings have their own retained poses. The engine still owns effect membership. */
export class WorldDisplays {
  private layers = new WeakMap<Field, Layers>();
  private screen: Instance;
  constructor(
    private readonly fields: FieldDisplays,
    private readonly effects: RegisteredEffects,
  ) {
    this.screen = this.instance(null, effects.screen);
  }
  private instance(symbol: number | null, effectLayer?: EffectLayer): Instance {
    return {
      identity: effectLayer ?? Object.freeze({}),
      symbol,
      pose: new RetainedTransform(),
      attached: true,
      effectLayer,
    };
  }
  private field(field: Field) {
    const layers = this.layers.get(field);
    if (!layers) throw new Error('World layers require explicit construction');
    return layers;
  }
  /** _-Ii/_-XS copy CURRENT root; next highlight copies NEXT root and wave scale. */
  construct(field: Field, current = field, first = false) {
    if (this.layers.has(field)) throw new Error('World layers constructed twice');
    const top = this.effects.layer(field, 'top');
    if (!top) throw new Error('Top layer identity must exist before its pose');
    const layers: Layers = {
      bullet: this.instance(1781),
      top: this.instance(1718, top),
      highlight: this.instance(1780),
    };
    const from = this.fields.readPose(current).pose;
    for (const layer of [layers.bullet, layers.top]) {
      layer.pose.x = from.x;
      layer.pose.y = from.y;
    }
    const root = this.fields.readPose(field).pose;
    layers.highlight.pose.x = root.x;
    layers.highlight.pose.y = root.y;
    if (!first) {
      // Chained assignment sets Y, then X; it replaces the authored scale.
      layers.highlight.pose.scaleY = field.scale;
      layers.highlight.pose.scaleX = field.scale;
    }
    this.layers.set(field, layers);
  }
  /** Source ordinary/transit movement rewrites only current and latest-next siblings. */
  follow(current: Field, next?: Field) {
    for (const field of [current, next]) {
      if (!field) continue;
      const root = this.fields.readPose(field).pose;
      const layers = this.field(field);
      for (const layer of [layers.highlight, layers.bullet, layers.top]) {
        layer.pose.x = root.x;
        layer.pose.y = root.y;
      }
    }
  }
  setCollapseScale(
    field: Field,
    kind: 'top' | 'bullet' | 'highlight',
    axis: 'scaleX' | 'scaleY',
    value: number,
  ) {
    this.field(field)[kind].pose[axis] = value;
  }
  setHighlightAlpha(field: Field, value: number) {
    this.field(field).highlight.pose.alpha = value;
  }
  /** _-4j removes the outgoing bullet/top before cache reads; bottom belongs to FieldDisplays. */
  detachLayers(field: Field) {
    this.field(field).bullet.attached = false;
    // Effect ownership is independent; World calls engine.detachLayer at this same phase.
  }
  /** The outgoing highlight is removed only after next-layer registration/promotion. */
  promote(outgoing: Field) {
    this.field(outgoing).highlight.attached = false;
  }
  read(field: Field, kind: Exclude<WorldLayerKind, 'screen'>): WorldLayerRead;
  read(field: undefined, kind: 'screen'): WorldLayerRead;
  read(field: Field | undefined, kind: WorldLayerKind): WorldLayerRead {
    const instance = kind === 'screen' ? this.screen : this.field(field!)[kind];
    const rooted = instance.effectLayer
      ? this.effects.layerAttached(instance.effectLayer)
      : instance.attached;
    return Object.freeze({
      identity: instance.identity,
      symbol: instance.symbol,
      kind,
      pose: instance.pose.read(),
      parent: rooted ? 'world' : null,
      rooted,
    });
  }
  /** Main's translation and fixed World origin are separate display ancestors. Zoom is a view addition. */
  mainMatrix(main: Readonly<Vec>): DisplayMatrix {
    return { ...DISPLAY_IDENTITY, tx: displayTwips(main.x), ty: displayTwips(main.y) };
  }
  worldMatrix(main: Readonly<Vec>): DisplayMatrix {
    return displayMatrixProduct(this.mainMatrix(main), {
      ...DISPLAY_IDENTITY,
      tx: STAGE.cx * 20,
      ty: STAGE.cy * 20,
    });
  }
  /** A detached field retains its own root/slot transforms but loses World/Main ancestry. */
  fieldMatrix(field: Field, main: Readonly<Vec>, slot?: FieldSlot): DisplayMatrix {
    const read = this.fields.readPose(field);
    const root = read.rooted
      ? displayMatrixProduct(this.worldMatrix(main), read.pose.matrix)
      : { ...read.pose.matrix };
    return slot ? displayMatrixProduct(root, this.fields.readPose(field, slot).pose.matrix) : root;
  }
  /**117 is a real nested child until removeChild; never approximate its scale by squaring a counter. */
  bottomMatrix(field: Field, main: Readonly<Vec>): DisplayMatrix {
    const bottom = this.fields.readPose(field, 'bottom');
    return bottom.parent === null
      ? { ...bottom.pose.matrix }
      : displayMatrixProduct(this.fieldMatrix(field, main, 'underEffects'), bottom.pose.matrix);
  }
  layerMatrix(field: Field, kind: Exclude<WorldLayerKind, 'screen'>, main: Readonly<Vec>) {
    const read = this.read(field, kind);
    return read.rooted
      ? displayMatrixProduct(this.worldMatrix(main), read.pose.matrix)
      : { ...read.pose.matrix };
  }
  layerGlobal(
    point: Readonly<Vec>,
    field: Field,
    kind: Exclude<WorldLayerKind, 'screen'>,
    main: Readonly<Vec>,
  ) {
    const result = displayMatrixPoint(this.layerMatrix(field, kind, main), {
      x: displayTwips(point.x),
      y: displayTwips(point.y),
    });
    return { x: result.x / 20, y: result.y / 20 };
  }
}
