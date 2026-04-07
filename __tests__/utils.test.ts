import { describe, it, expect } from "vitest";
import { formatPrice, calculateCommission } from "@/lib/utils";

describe("formatPrice", () => {
  it("formats 0 millimes as 0.000", () => {
    expect(formatPrice(0)).toBe("0.000 TND");
  });

  it("formats 1000 millimes as 1.000 TND", () => {
    expect(formatPrice(1000)).toBe("1.000 TND");
  });

  it("formats 49500 millimes as 49.500 TND", () => {
    expect(formatPrice(49500)).toBe("49.500 TND");
  });

  it("formats 100 millimes as 0.100 TND", () => {
    expect(formatPrice(100)).toBe("0.100 TND");
  });
});

describe("calculateCommission", () => {
  it("calculates 5% of 10000", () => {
    expect(calculateCommission(10000)).toBe(500);
  });

  it("calculates 5% of 49500", () => {
    expect(calculateCommission(49500)).toBe(2475);
  });

  it("calculates 5% of 0", () => {
    expect(calculateCommission(0)).toBe(0);
  });

  it("rounds 5% of 1001 to 50", () => {
    expect(calculateCommission(1001)).toBe(50);
  });
});
