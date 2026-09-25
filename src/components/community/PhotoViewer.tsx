import Lightbox from "yet-another-react-lightbox";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import "yet-another-react-lightbox/styles.css";
import "../recipe/CardLightbox.css";

interface Props {
  src: string;
  width: number;
  height: number;
  alt: string;
  onClose: () => void;
}

/** A photo someone shared with a note, full screen and zoomable. */
export default function PhotoViewer({ src, width, height, alt, onClose }: Props) {
  return (
    <Lightbox
      open
      close={onClose}
      slides={[{ src, width, height, alt }]}
      plugins={[Zoom]}
      zoom={{ maxZoomPixelRatio: 2, scrollToZoom: true, doubleClickMaxStops: 2 }}
      carousel={{ finite: true, padding: "16px" }}
      controller={{ closeOnBackdropClick: true }}
      render={{ buttonPrev: () => null, buttonNext: () => null }}
      labels={{ "Zoom in": "Zoom in", "Zoom out": "Zoom out" }}
      styles={{ root: { "--yarl__color_backdrop": "rgba(24, 19, 16, 0.96)" } }}
    />
  );
}
