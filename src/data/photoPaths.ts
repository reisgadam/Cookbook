// Paths of the images written by scripts/build-images.mjs, relative to the
// site root. Pure so the build plugin can share them.

export type PhotoSize = "sm" | "md" | "lg";

const stem = (file: string) => file.replace(/\.[^.]+$/, "");

export function photoPath(file: string, size: PhotoSize): string {
  return `photos/${size}/${stem(file)}.webp`;
}

export function ogImagePath(file: string): string {
  return `photos/og/${stem(file)}.jpg`;
}

export function familyPhotoPath(file: string, width: number): string {
  return `photos/family/${stem(file)}-${width}.webp`;
}
