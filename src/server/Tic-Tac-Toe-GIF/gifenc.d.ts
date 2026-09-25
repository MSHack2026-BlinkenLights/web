declare module "gifenc" {
  export type GifPalette = number[][];

  const gifenc: {
    quantize(pixels: Uint8Array, maxColors: number): GifPalette;
    applyPalette(pixels: Uint8Array, palette: GifPalette): Uint8Array;
    GIFEncoder(): {
      writeFrame(
        indexedPixels: Uint8Array,
        width: number,
        height: number,
        options: { palette: GifPalette; delay: number },
      ): void;
      finish(): void;
      bytes(): Uint8Array;
    };
  };

  export default gifenc;
}
