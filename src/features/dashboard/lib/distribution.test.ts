import { describe, expect, it } from "bun:test";
import { buildDistribution } from "./distribution";

describe("buildDistribution", () => {
  it("returns zero percentages when nothing was generated", () => {
    const slices = buildDistribution({ conversations: 0, images: 0, music: 0 });

    expect(slices).toHaveLength(3);
    expect(slices.every((slice) => slice.percent === 0)).toBe(true);
  });

  it("rounds percentages against the total", () => {
    const slices = buildDistribution({
      conversations: 1,
      images: 2,
      music: 1,
    });

    expect(slices.map((slice) => slice.value)).toEqual([1, 2, 1]);
    expect(slices.map((slice) => slice.percent)).toEqual([25, 50, 25]);
  });
});
