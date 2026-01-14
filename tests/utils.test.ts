import { describe, it, expect } from "bun:test";
import { formatDuration, shortEmail, progressBar, extractProjectId } from "../src/utils";

describe("Utils", () => {
  describe("formatDuration", () => {
    it("should format minutes correctly", () => {
      expect(formatDuration(60 * 1000)).toBe("1m");
      expect(formatDuration(59 * 60 * 1000)).toBe("59m");
    });

    it("should format hours and minutes correctly", () => {
      expect(formatDuration(60 * 60 * 1000)).toBe("1h 0m");
      expect(formatDuration(90 * 60 * 1000)).toBe("1h 30m");
    });

    it("should format days and hours correctly", () => {
      expect(formatDuration(24 * 60 * 60 * 1000)).toBe("1d 0h");
      expect(formatDuration(25 * 60 * 60 * 1000)).toBe("1d 1h");
    });

    it("should handle negative inputs by taking absolute value", () => {
      expect(formatDuration(-60 * 1000)).toBe("1m");
    });
  });

  describe("shortEmail", () => {
    it("should extract username from email", () => {
      expect(shortEmail("user@example.com")).toBe("user");
      expect(shortEmail("john.doe@gmail.com")).toBe("john.doe");
    });

    it("should return full string if no @ present", () => {
      expect(shortEmail("localuser")).toBe("localuser");
    });
  });

  describe("progressBar", () => {
    it("should render 0%", () => {
      expect(progressBar(0)).toBe("[░░░░░░░░░░] 0%");
    });

    it("should render 50%", () => {
      expect(progressBar(50)).toBe("[█████░░░░░] 50%");
    });

    it("should render 100%", () => {
      expect(progressBar(100)).toBe("[██████████] 100%");
    });

    it("should round to nearest block", () => {
      // 10 blocks, so each block is 10%
      // 14% -> 1.4 blocks -> rounds to 1
      expect(progressBar(14)).toBe("[█░░░░░░░░░] 14%");
      // 16% -> 1.6 blocks -> rounds to 2
      expect(progressBar(16)).toBe("[██░░░░░░░░] 16%");
    });
  });

  describe("extractProjectId", () => {
    it("should return string input as is", () => {
      expect(extractProjectId("my-project")).toBe("my-project");
    });

    it("should extract id from object", () => {
      expect(extractProjectId({ id: "obj-project" })).toBe("obj-project");
    });

    it("should return undefined for invalid inputs", () => {
      expect(extractProjectId(null)).toBeUndefined();
      expect(extractProjectId({})).toBeUndefined();
      expect(extractProjectId(123)).toBeUndefined();
    });
  });
});
