import type { ImageQualityResult } from '@/src/types/registration';

const loadImage = (file: File) => new Promise<HTMLImageElement>((resolve, reject) => {
  const url = URL.createObjectURL(file);
  const image = new Image();
  image.onload = () => { URL.revokeObjectURL(url); resolve(image); };
  image.onerror = () => { URL.revokeObjectURL(url); reject(new Error('This image could not be read.')); };
  image.src = url;
});

export async function analyzeDocumentImage(file: File): Promise<ImageQualityResult> {
  const image = await loadImage(file);
  const scale = Math.min(1, 320 / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('Image quality checks are unavailable in this browser.');
  context.drawImage(image, 0, 0, width, height);
  const pixels = context.getImageData(0, 0, width, height).data;
  const gray = new Float32Array(width * height);
  let brightnessTotal = 0;
  let brightPixels = 0;
  let darkPixels = 0;
  for (let index = 0; index < gray.length; index += 1) {
    const offset = index * 4;
    const value = pixels[offset] * .299 + pixels[offset + 1] * .587 + pixels[offset + 2] * .114;
    gray[index] = value;
    brightnessTotal += value;
    if (value > 245) brightPixels += 1;
    if (value < 25) darkPixels += 1;
  }
  let laplacianTotal = 0;
  let laplacianSquared = 0;
  let samples = 0;
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const index = y * width + x;
      const value = 4 * gray[index] - gray[index - 1] - gray[index + 1] - gray[index - width] - gray[index + width];
      laplacianTotal += value;
      laplacianSquared += value * value;
      samples += 1;
    }
  }
  const brightness = brightnessTotal / gray.length;
  const laplacianMean = samples ? laplacianTotal / samples : 0;
  const sharpness = samples ? (laplacianSquared / samples) - laplacianMean * laplacianMean : 0;
  const warnings: string[] = [];
  if (image.naturalWidth < 1000 || image.naturalHeight < 700) warnings.push('Resolution is low; small text may be difficult to read.');
  if (sharpness < 55) warnings.push('The image may be too blurry for reliable text reading.');
  if (brightness > 228 || brightPixels / gray.length > .42) warnings.push('The image may be overexposed.');
  if (brightness < 48 || darkPixels / gray.length > .42) warnings.push('The image may be underexposed.');
  const ratio = image.naturalWidth / image.naturalHeight;
  if (ratio > 2.15 || ratio < .45) warnings.push('Check that all four document corners are visible.');
  return {
    width: image.naturalWidth,
    height: image.naturalHeight,
    brightness: Math.round(brightness),
    sharpness: Math.round(sharpness),
    warnings,
  };
}
