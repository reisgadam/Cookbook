import Lightbox from "yet-another-react-lightbox";
import Counter from "yet-another-react-lightbox/plugins/counter";
import Download from "yet-another-react-lightbox/plugins/download";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import "yet-another-react-lightbox/plugins/counter.css";
import "yet-another-react-lightbox/styles.css";
import { photoInfo, photoUrl } from "../../data/photos";
import "./CardLightbox.css";

export interface CardPhoto {
  file: string;
  alt: string;
}

interface Props {
  photos: CardPhoto[];
  index: number;
  downloadName: string;
  onClose: () => void;
}

/** Full-screen, zoomable view of the original card (pinch, scroll or double-tap). */
export default function CardLightbox({ photos, index, downloadName, onClose }: Props) {
  const slides = photos.map(({ file, alt }, i) => {
    const info = photoInfo(file);
    const scale = (width: number) => (info ? Math.round((width * info.h) / info.w) : undefined);
    return {
      src: photoUrl(file, "xl"),
      alt,
      width: info?.widths.xl,
      height: info ? scale(info.widths.xl) : undefined,
      srcSet: info
        ? (["md", "lg", "xl"] as const).map((size) => ({
            src: photoUrl(file, size),
            width: info.widths[size],
            height: scale(info.widths[size])!,
          }))
        : undefined,
      download: {
        url: photoUrl(file, "xl"),
        filename: photos.length > 1 ? `${downloadName}-${i + 1}.webp` : `${downloadName}.webp`,
      },
    };
  });

  const single = slides.length <= 1;

  return (
    <Lightbox
      open
      close={onClose}
      index={index}
      slides={slides}
      plugins={single ? [Zoom, Download] : [Zoom, Counter, Download]}
      zoom={{ maxZoomPixelRatio: 3, scrollToZoom: true, doubleClickMaxStops: 2 }}
      carousel={{ finite: true, padding: "16px" }}
      counter={{ container: { style: { top: "unset", bottom: 0 } } }}
      controller={{ closeOnBackdropClick: true }}
      render={single ? { buttonPrev: () => null, buttonNext: () => null } : undefined}
      labels={{ Download: "Download this photo", "Zoom in": "Zoom in", "Zoom out": "Zoom out" }}
      styles={{ root: { "--yarl__color_backdrop": "rgba(24, 19, 16, 0.96)" } }}
    />
  );
}
