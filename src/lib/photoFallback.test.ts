import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { installPhotoFallback, missingPhoto } from "./photoFallback";

function image(src: string, attributes: Record<string, string> = {}) {
  const img = document.createElement("img");
  img.src = src;
  for (const [name, value] of Object.entries(attributes)) img.setAttribute(name, value);
  document.body.append(img);
  return img;
}

const fail = (img: HTMLImageElement) => img.dispatchEvent(new Event("error"));

describe("missingPhoto", () => {
  it("keeps the photo's proportions", () => {
    const svg = decodeURIComponent(missingPhoto(1200, 1600).replace("data:image/svg+xml,", ""));
    expect(svg).toContain('width="1200" height="1600" viewBox="0 0 1200 1600"');
  });
});

describe("installPhotoFallback", () => {
  beforeAll(() => installPhotoFallback());
  afterEach(() => document.body.replaceChildren());

  it("swaps a photo that fails to load for the placeholder", () => {
    const img = image("/Cookbook/photos/md/IMG_5740.webp", {
      srcset: "/Cookbook/photos/sm/IMG_5740.webp 360w",
      width: "1200",
      height: "900",
      alt: "Her card",
    });
    fail(img);
    expect(img.getAttribute("src")).toBe(missingPhoto(1200, 900));
    expect(img.hasAttribute("srcset")).toBe(false);
    expect(img.alt).toBe("Her card");
  });

  it("leaves other images alone", () => {
    const img = image("/Cookbook/icons/icon-192.png");
    fail(img);
    expect(img.getAttribute("src")).toBe("/Cookbook/icons/icon-192.png");
  });

  it("leaves the zoom viewer to show its own message", () => {
    const portal = document.createElement("div");
    portal.className = "yarl__portal";
    document.body.append(portal);
    const img = image("/Cookbook/photos/lg/IMG_5740.webp");
    portal.append(img);
    fail(img);
    expect(img.getAttribute("src")).toBe("/Cookbook/photos/lg/IMG_5740.webp");
  });
});
