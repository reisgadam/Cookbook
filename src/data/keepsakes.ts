// Photos shown outside the recipe pages. The content tests check that every
// photo in content/photos is used by a recipe or listed here.

/** Her handwritten index page, at the front of the spiral notebook. */
export const NOTEBOOK_INDEX_PHOTO = "IMG_5693.JPG";

export interface Keepsake {
  file: string;
  title: string;
  /** Line-by-line transcription of the note. */
  lines: string[];
  caption: string;
}

/** Little notes from her kitchen that aren't recipes, shown on the About page. */
export const KEEPSAKES: Keepsake[] = [
  {
    file: "IMG_5839.JPG",
    title: "Orange Cinnamon Market Spice Tea",
    lines: [
      "Store in freezer or it will go rancid",
      "Specialty Spice Shop, Seattle",
      "@ Pike Place Market",
      "Orange Cinnamon Market Spice Tea",
      "Available in decaf & regular, loose leaf or bags",
      "Available via mail order & website",
    ],
    caption: "A note she kept about a tea from Pike Place Market in Seattle.",
  },
];

export const NON_RECIPE_PHOTOS = [NOTEBOOK_INDEX_PHOTO, ...KEEPSAKES.map((k) => k.file)];
