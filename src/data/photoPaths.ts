// Paths of the images written by scripts/build-images.mjs, relative to the
// site root. Pure so the build plugin can share them.

export type PhotoSize = "sm" | "md" | "lg" | "xl";

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

/** `srcset` for a recipe photo shown large: 720 wide for phones, up to 2400 for zooming. */
export function photoSrcSetFor(base: string, file: string, widths: Record<PhotoSize, number>): string {
  return (["md", "lg", "xl"] as const)
    .map((size) => `${base}${photoPath(file, size)} ${widths[size]}w`)
    .join(", ");
}

/** `srcset` for a family photo, which is resized to several widths. */
export function familySrcSetFor(base: string, file: string, widths: number[]): string {
  return widths.map((width) => `${base}${familyPhotoPath(file, width)} ${width}w`).join(", ");
}

/**
 * The `sizes` of each page's first big photo. The build uses the same values
 * to start downloading that photo before the page's code has run (see
 * vite-plugins/staticRoutes.ts), so the pages must use these, too.
 */
export const LEAD_PHOTO_SIZES = {
  original: "(max-width: 1023px) 80vw, 30rem",
  homePortrait: "(max-width: 860px) 70vw, 30rem",
  aboutPortrait: "(max-width: 860px) 70vw, 24rem",
  notebookIndex: "(max-width: 900px) 92vw, 36rem",
} as const;

/** `sizes` for the notebook photo beside the text on the home and About pages. */
export const NOTEBOOK_TEASER_SIZES = "(max-width: 860px) 92vw, 34rem";
