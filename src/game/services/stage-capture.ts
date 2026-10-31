type CaptureLayer = {
  order: number;
  base?: boolean;
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
  capture() {
    if (![...this.layers].some((layer) => layer.base)) return;
    const canvas = document.createElement('canvas');
    canvas.width = 550;
    canvas.height = 450;
    const context = canvas.getContext('2d', { willReadFrequently: true })!;
    for (const layer of [...this.layers].sort((a, b) => a.order - b.order)) {
      context.save();
      layer.draw(context);
      context.restore();
    }
    return context.getImageData(0, 0, 550, 450);
  }
}
