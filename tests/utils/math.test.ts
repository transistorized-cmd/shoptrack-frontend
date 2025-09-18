import { describe, it, expect } from "vitest";

// Simple test to verify Vitest is working
describe("Basic Math Operations", () => {
  it("should add two numbers correctly", () => {
    expect(2 + 2).toBe(4);
  });

  it("should subtract two numbers correctly", () => {
    expect(10 - 5).toBe(5);
  });

  it("should multiply two numbers correctly", () => {
    expect(3 * 4).toBe(12);
  });

  it("should divide two numbers correctly", () => {
    expect(20 / 4).toBe(5);
  });
});
