// Gets a photo ready to share with a note: the right way up, shrunk to a
// sensible size, and saved as a JPEG small enough for the database (see
// commentPhotos in firestore.rules). Drawing it onto a canvas also leaves
// behind everything else in the original file, including where it was taken.

/** The most a photo may take up once prepared; firestore.rules enforces it too. */
export const PHOTO_MAX_BYTES = 700_000;

export interface PreparedPhoto {
  blob: Blob;
  width: number;
  height: number;
}

/** A problem with the chosen photo, worded for the person who chose it. */
export class PhotoError extends Error {}

/** Shrinks (never enlarges) a size so its longer side is at most `max`. */
export function fitWithin(width: number, height: number, max: number): { width: number; height: number } {
  const scale = Math.min(1, max / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

// Sharp on phones and laptops, and usually 150–350 KB. Falls back to lower
// quality, then a smaller size, for unusually detailed photos.
const ATTEMPTS: Array<[longestSide: number, quality: number]> = [
  [1280, 0.85],
  [1280, 0.75],
  [1280, 0.65],
  [1024, 0.65],
];

function encode(
  image: HTMLImageElement,
  width: number,
  height: number,
  quality: number,
): Promise<Blob | null> {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return Promise.resolve(null);
  // JPEGs can't be see-through, so transparent parts of a PNG become white.
  context.fillStyle = "#fff";
  context.fillRect(0, 0, width, height);
  context.imageSmoothingQuality = "high";
  context.drawImage(image, 0, 0, width, height);
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
}

export async function preparePhoto(file: File): Promise<PreparedPhoto> {
  if (file.type && !file.type.startsWith("image/")) throw new PhotoError("That file isn’t a photo.");
  const url = URL.createObjectURL(file);
  try {
    // An <img> turns phone photos upright using the orientation saved in the file.
    const image = new Image();
    image.src = url;
    try {
      await image.decode();
    } catch {
      throw new PhotoError("This photo can’t be opened here. Please try a JPG or PNG photo.");
    }
    for (const [longestSide, quality] of ATTEMPTS) {
      const { width, height } = fitWithin(image.naturalWidth, image.naturalHeight, longestSide);
      const blob = await encode(image, width, height, quality);
      if (blob && blob.size <= PHOTO_MAX_BYTES) return { blob, width, height };
    }
    throw new PhotoError("This photo is too large to share, even after shrinking it. Please try another.");
  } finally {
    URL.revokeObjectURL(url);
  }
}
