import {
  AlphaType,
  BlendMode,
  ColorType,
  FilterMode,
  MipmapMode,
  PaintStyle,
  Skia,
  StrokeCap,
  StrokeJoin,
  TileMode,
  type SkCanvas,
  type SkImage,
  type SkPaint,
  type SkRuntimeEffect,
  type SkShader,
  type SkSurface,
} from '@shopify/react-native-skia';
import type { Op, StrokeOp } from './ops';
import type { RegionPixels } from './regionMap';
import { traceStroke } from './stroke';

// The paint layer (F02): a size×size RGBA image under the line art. Fills and brush/eraser lines
// (F03) are drawn into it. Filling a region replaces everything in it (earlier fills and lines)
// with one solid colour.
//
// P2 spike: three implementations to compare on a real phone, see F02 "Kết quả spike".
//   gpu    – RuntimeEffect shader drawn into a GPU offscreen surface (plan A)
//   raster – same shader, CPU-backed Skia surface
//   cpu    – plain JS: write the region's pixels into a buffer, rebuild the image (plan B).
//            Lines go through a temporary raster surface.

export type PaintStrategy = 'gpu' | 'raster' | 'cpu';

/**
 * Chosen after the P2 spike (F02 "Kết quả spike"): exact on iPhone (self-check 0 wrong pixels),
 * fill ≈ 5 ms in Expo Go. 'raster' / 'cpu' stay as fallbacks to compare on Android in phase B.
 */
export const DEFAULT_PAINT_STRATEGY: PaintStrategy = 'gpu';

export interface PaintLayer {
  readonly strategy: PaintStrategy;
  readonly size: number;
  /** Current layer as an image that can be drawn by <Canvas> (as of the last commit). */
  image(): SkImage;
  /** Draws an operation. Call commit() afterwards to get the new image. */
  draw(op: Op): void;
  /** Takes a new image of the layer after draw() / reset(). */
  commit(): SkImage;
  /** Replaces the whole layer with `image` (a checkpoint), or makes it empty. */
  reset(image: SkImage | null): void;
  /** Encode the layer as PNG (for saving). */
  encodePng(): Uint8Array;
  dispose(): void;
}

// Keeps `color` only inside region `target` (decoded from the region map, id = R + 256·G).
// target = 0: everywhere ("tô không tràn viền" off); target < 0: nowhere (region not known yet).
// Used for fills, clipped lines, and the live line drawn while the finger moves.
export const MASK_SKSL = `
uniform shader regions;
uniform float target;
uniform float4 color;
half4 main(float2 xy) {
  if (target < -0.5) return half4(0.0);
  if (target < 0.5) return half4(color);
  half4 c = regions.eval(xy);
  float id = floor(c.r * 255.0 + 0.5) + 256.0 * floor(c.g * 255.0 + 0.5);
  return abs(id - target) < 0.5 ? half4(color) : half4(0.0);
}`;

let maskEffect: SkRuntimeEffect | null = null;
export function getMaskEffect(): SkRuntimeEffect {
  if (!maskEffect) {
    maskEffect = Skia.RuntimeEffect.Make(MASK_SKSL);
    if (!maskEffect) throw new Error('Mask shader failed to compile');
  }
  return maskEffect;
}

export function hexToRgba(hex: string): [number, number, number, number] {
  const n = parseInt(hex.slice(1, 7), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 255];
}

/** #RRGGBB → [r, g, b, 1] in 0..1 (shader uniform). */
export function hexToUnit(hex: string): [number, number, number, number] {
  const [r, g, b] = hexToRgba(hex);
  return [r / 255, g / 255, b / 255, 1];
}

const imageInfo = (size: number) => ({
  width: size,
  height: size,
  colorType: ColorType.RGBA_8888,
  alphaType: AlphaType.Unpremul,
});

/** Paints ops onto a Skia canvas. `regionShader` is null for free drawing (no regions). */
function makeOpPainter(regionShader: SkShader | null, size: number) {
  const rect = Skia.XYWHRect(0, 0, size, size);
  const masked = (target: number, color: string): SkPaint => {
    const paint = Skia.Paint();
    paint.setAntiAlias(true);
    if (regionShader && target !== 0) paint.setShader(getMaskEffect().makeShaderWithChildren([target, ...hexToUnit(color)], [regionShader]));
    else paint.setColor(Skia.Color(color));
    return paint;
  };
  const stroke = (canvas: SkCanvas, op: StrokeOp) => {
    const paint = masked(op.clip, op.color);
    paint.setStyle(PaintStyle.Stroke);
    paint.setStrokeWidth(op.width);
    paint.setStrokeCap(StrokeCap.Round);
    paint.setStrokeJoin(StrokeJoin.Round);
    const builder = Skia.PathBuilder.Make();
    traceStroke(op.points, builder);
    canvas.drawPath(builder.detach(), paint);
  };
  return (canvas: SkCanvas, op: Op) => {
    switch (op.type) {
      case 'fill':
        if (regionShader) canvas.drawRect(rect, masked(op.region, op.color));
        return;
      case 'stroke':
        stroke(canvas, op);
        return;
      case 'clear':
        canvas.clear(Skia.Color('transparent'));
        return;
    }
  };
}

function drawImageInto(canvas: SkCanvas, image: SkImage, size: number) {
  const paint = Skia.Paint();
  paint.setBlendMode(BlendMode.Src);
  canvas.drawImageRect(image, Skia.XYWHRect(0, 0, image.width(), image.height()), Skia.XYWHRect(0, 0, size, size), paint);
}

/** Draws `initial` (saved paint.png) if given, otherwise starts transparent. */
function createShaderLayer(strategy: 'gpu' | 'raster', regions: SkImage | null, size: number, initial?: SkImage | null): PaintLayer {
  const surface: SkSurface | null = strategy === 'gpu' ? Skia.Surface.MakeOffscreen(size, size) : Skia.Surface.Make(size, size);
  if (!surface) throw new Error(`Cannot create ${strategy} surface`);
  const canvas = surface.getCanvas();
  canvas.clear(Skia.Color('transparent'));
  if (initial) drawImageInto(canvas, initial, size);
  const regionShader = regions ? regions.makeShaderOptions(TileMode.Clamp, TileMode.Clamp, FilterMode.Nearest, MipmapMode.None) : null;
  const paintOp = makeOpPainter(regionShader, size);

  // Images drawn by <Canvas> must not be GPU textures of another context.
  const snapshot = () => {
    surface.flush();
    const snap = surface.makeImageSnapshot();
    return strategy === 'gpu' ? (snap.makeNonTextureImage() ?? snap) : snap;
  };
  let current = snapshot();

  return {
    strategy,
    size,
    image: () => current,
    draw: (op) => paintOp(canvas, op),
    commit() {
      current = snapshot();
      return current;
    },
    reset(image) {
      canvas.clear(Skia.Color('transparent'));
      if (image) drawImageInto(canvas, image, size);
    },
    encodePng: () => current.encodeToBytes(),
    dispose: () => surface.dispose?.(),
  };
}

function createCpuLayer(index: RegionPixels | null, regions: SkImage | null, size: number, initial?: SkImage | null): PaintLayer {
  const buffer = new Uint8Array(size * size * 4);
  const readInto = (image: SkImage | null) => {
    buffer.fill(0);
    if (!image) return;
    const px = image.readPixels(0, 0, imageInfo(size));
    if (px instanceof Uint8Array && px.length === buffer.length) buffer.set(px);
  };
  readInto(initial ?? null);
  const make = () => {
    const img = Skia.Image.MakeImage(imageInfo(size), Skia.Data.fromBytes(buffer), size * 4);
    if (!img) throw new Error('MakeImage failed');
    return img;
  };
  const regionShader = regions ? regions.makeShaderOptions(TileMode.Clamp, TileMode.Clamp, FilterMode.Nearest, MipmapMode.None) : null;
  const paintOp = makeOpPainter(regionShader, size);
  let current = make();

  const fill = (id: number, color: string) => {
    if (!index) return;
    const [r, g, b, a] = hexToRgba(color);
    const { start, pixels } = index;
    for (let k = start[id]; k < start[id + 1]; k++) {
      const p = pixels[k] * 4;
      buffer[p] = r;
      buffer[p + 1] = g;
      buffer[p + 2] = b;
      buffer[p + 3] = a;
    }
  };
  // Lines: draw the buffer + the line on a temporary raster surface, read the pixels back.
  const strokeOp = (op: Op) => {
    const surface = Skia.Surface.Make(size, size);
    if (!surface) throw new Error('Cannot create raster surface');
    const canvas = surface.getCanvas();
    canvas.clear(Skia.Color('transparent'));
    drawImageInto(canvas, make(), size);
    paintOp(canvas, op);
    surface.flush();
    readInto(surface.makeImageSnapshot());
  };

  return {
    strategy: 'cpu',
    size,
    image: () => current,
    draw(op) {
      if (op.type === 'fill') fill(op.region, op.color);
      else if (op.type === 'clear') buffer.fill(0);
      else strokeOp(op);
    },
    commit() {
      current = make();
      return current;
    },
    reset: (image) => readInto(image),
    encodePng: () => current.encodeToBytes(),
    dispose: () => {},
  };
}

/** `regions` is null for free drawing (S06): no fills, lines are never clipped. */
export function createPaintLayer(
  strategy: PaintStrategy,
  opts: { regions: SkImage | null; size: number; initial?: SkImage | null; index?: RegionPixels },
): PaintLayer {
  if (strategy !== 'cpu') return createShaderLayer(strategy, opts.regions, opts.size, opts.initial);
  if (opts.regions && !opts.index) throw new Error('cpu paint layer needs the region pixel index');
  return createCpuLayer(opts.index ?? null, opts.regions, opts.size, opts.initial);
}

/** CPU image from RGBA bytes (size×size). */
export function rasterImage(rgba: Uint8Array, size: number): SkImage | null {
  return Skia.Image.MakeImage(imageInfo(size), Skia.Data.fromBytes(rgba), size * 4);
}

/** Region map pixels as RGBA bytes (for decodeRegionIds). */
export function readRegionPixels(regions: SkImage): Uint8Array {
  const size = regions.width();
  const px = regions.readPixels(0, 0, imageInfo(size));
  if (!(px instanceof Uint8Array)) throw new Error('Cannot read region map pixels');
  return px;
}
