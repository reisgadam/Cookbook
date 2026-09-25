import manifest from "../generated/photos.json";
import { familyPhotoPath, photoPath, type PhotoSize } from "./photoPaths";

export interface PhotoInfo {
  /** Upright dimensions of the original photo. */
  w: number;
  h: number;
  /** Dominant colour, used as a placeholder while the image loads. */
  color: string;
  widths: Record<PhotoSize, number>;
}

export interface FamilyPhotoInfo {
  w: number;
  h: number;
  color: string;
  widths: number[];
}

const photos = manifest.photos as Record<string, PhotoInfo>;
const family = manifest.family as Record<string, FamilyPhotoInfo>;
const base = import.meta.env.BASE_URL;

export function photoInfo(file: string): PhotoInfo | undefined {
  return photos[file];
}

export function photoUrl(file: string, size: PhotoSize): string {
  return base + photoPath(file, size);
}

/** `srcset` for the detail-page and zoom sizes. */
export function photoSrcSet(file: string): string | undefined {
  const info = photos[file];
  if (!info) return undefined;
  return (["md", "lg"] as const).map((size) => `${photoUrl(file, size)} ${info.widths[size]}w`).join(", ");
}

export function familyPhoto(file: string): { src: string; srcSet: string; info: FamilyPhotoInfo } | undefined {
  const info = family[file];
  if (!info) return undefined;
  const srcSet = info.widths.map((w) => `${base}${familyPhotoPath(file, w)} ${w}w`).join(", ");
  return { src: base + familyPhotoPath(file, info.widths[1] ?? info.widths[0]), srcSet, info };
}
