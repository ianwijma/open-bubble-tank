type CaptureLayer = {
  order: number;
  base?: boolean;
  /** Refresh owned paint from current model state without advancing its clocks. */
  prepare?: () => void;
  draw: (context: CanvasRenderingContext2D) => void;
};

/** Browser-owned render layers for BitmapData-style captures, without simulation dependencies. */
export class StageCapture {
  private layers = new Set<CaptureLayer>();
  register(layer: CaptureLayer) {
    this.layers.add(layer);
    return () => {
      this.layers.delete(layer);
    };
  }
  capture({ refresh = false }: { refresh?: boolean } = {}) {
    const layers = [...this.layers].sort((a, b) => a.order - b.order);
    if (!layers.some((layer) => layer.base)) return;
    if (refresh) for (const layer of layers) if (this.layers.has(layer)) layer.prepare?.();
    // A prepare can release its owner; never copy a disposed base or canvas.
    if (!layers.some((layer) => layer.base && this.layers.has(layer))) return;
    const canvas = document.createElement('canvas');
    canvas.width = 550;
    canvas.height = 450;
    const context = canvas.getContext('2d', { willReadFrequently: true })!;
    for (const layer of layers) {
      if (!this.layers.has(layer)) continue;
      context.save();
      layer.draw(context);
      context.restore();
    }
    return context.getImageData(0, 0, 550, 450);
  }
}
