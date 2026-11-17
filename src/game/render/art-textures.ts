import { CanvasSource, Texture } from 'pixi.js';
import type { Raster } from '../assets/asset-pack';
import type { RasterTextures } from './symbol-view';

/** Renderer-owned textures, one per prepared raster. */
export class ArtTextures implements RasterTextures {
  private textures = new Map<Raster, Texture>();
  get(raster: Raster) {
    let texture = this.textures.get(raster);
    if (!texture) {
      texture = new Texture({
        source: new CanvasSource({ resource: raster.canvas, resolution: raster.resolution }),
      });
      this.textures.set(raster, texture);
    }
    return texture;
  }
  destroy() {
    for (const texture of this.textures.values()) texture.destroy(true);
    this.textures.clear();
  }
}
