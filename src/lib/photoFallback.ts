// When one of the site's photos can't load (almost always because the phone
// is offline and hasn't saved that photo yet), show a quiet "no photo" mark on
// the photo's own background colour instead of the browser's broken-image
// icon. The replacement keeps the photo's proportions, so nothing moves, and
// the alt text is left alone for screen readers.

// lucide's image-off icon, drawn on a 24-unit grid.
const ICON =
  '<path d="M2 2l20 20M10.41 10.41a2 2 0 1 1-2.83-2.83M13.5 13.5L6 21M18 12l3 3M3.59 3.59A1.99 1.99 0 0 0 3 5v14a2 2 0 0 0 2 2h14c.55 0 1.052-.22 1.41-.59M21 15V5a2 2 0 0 0-2-2H9"/>';

export function missingPhoto(width: number, height: number): string {
  const size = Math.min(width, height) * 0.14;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
    `<g transform="translate(${(width - size) / 2} ${(height - size) / 2}) scale(${size / 24})" fill="none" ` +
    `stroke="#2b2118" stroke-opacity=".45" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${ICON}</g></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function onError(event: Event) {
  const img = event.target;
  if (!(img instanceof HTMLImageElement) || !(img.currentSrc || img.src).includes("/photos/")) return;
  // The zoom viewer shows its own message.
  if (img.closest(".yarl__portal")) return;
  const width = Number(img.getAttribute("width")) || img.clientWidth || 4;
  const height = Number(img.getAttribute("height")) || img.clientHeight || 3;
  img.removeAttribute("srcset");
  img.src = missingPhoto(width, height);
}

export function installPhotoFallback(): void {
  // Image errors don't bubble, but a capturing listener on the document sees them.
  document.addEventListener("error", onError, true);
}
