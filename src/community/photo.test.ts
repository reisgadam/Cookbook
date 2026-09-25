import { describe, expect, it } from "vitest";
import { fitWithin } from "./photo";

describe("fitWithin", () => {
  it("shrinks the longer side to the limit and keeps the shape", () => {
    expect(fitWithin(4032, 3024, 1280)).toEqual({ width: 1280, height: 960 });
    expect(fitWithin(3024, 4032, 1280)).toEqual({ width: 960, height: 1280 });
  });

  it("never enlarges a small photo", () => {
    expect(fitWithin(800, 600, 1280)).toEqual({ width: 800, height: 600 });
  });

  it("keeps very thin photos at least a pixel wide", () => {
    expect(fitWithin(20000, 10, 1280)).toEqual({ width: 1280, height: 1 });
  });
});
