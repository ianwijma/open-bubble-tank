import { CanvasSource, Texture } from 'pixi.js';
import type { Raster } from '../assets/asset-pack';
import type { RasterTextures } from './swf-symbol-view';

/** Renderer-owned textures; animated morph poses live only while a view uses them. */
export class SwfTextures implements RasterTextures {
  private textures = new Map<Raster, Texture>();
  private refs = new Map<Raster, number>();
  get(raster: Raster) {
    if (raster.morph) this.refs.set(raster, (this.refs.get(raster) ?? 0) + 1);
    let texture = this.textures.get(raster);
    if (!texture) {
      texture = new Texture({
        source: new CanvasSource({ resource: raster.canvas, resolution: raster.resolution }),
      });
      this.textures.set(raster, texture);
    }
    return texture;
  }
  release(raster: Raster) {
    if (!raster.morph) return;
    const refs = (this.refs.get(raster) ?? 1) - 1;
    if (refs > 0) {
      this.refs.set(raster, refs);
      return;
    }
    this.refs.delete(raster);
    this.textures.get(raster)?.destroy(true);
    this.textures.delete(raster);
  }
  destroy() {
    for (const texture of this.textures.values()) texture.destroy(true);
    this.textures.clear();
    this.refs.clear();
  }
}
