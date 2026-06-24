import { describe, it, expect } from "vitest";
import { VisitStatus } from "@/generated/prisma/enums";
import { isValidTransition, getAllowedTransitions } from "../visit-transitions";

describe("isValidTransition", () => {
  it("allows EXPECTED -> CHECKED_IN", () => {
    expect(isValidTransition(VisitStatus.EXPECTED, VisitStatus.CHECKED_IN)).toBe(true);
  });

  it("allows EXPECTED -> CANCELLED", () => {
    expect(isValidTransition(VisitStatus.EXPECTED, VisitStatus.CANCELLED)).toBe(true);
  });

  it("allows EXPECTED -> NO_SHOW", () => {
    expect(isValidTransition(VisitStatus.EXPECTED, VisitStatus.NO_SHOW)).toBe(true);
  });

  it("allows CHECKED_IN -> CHECKED_OUT", () => {
    expect(isValidTransition(VisitStatus.CHECKED_IN, VisitStatus.CHECKED_OUT)).toBe(true);
  });

  it("allows CHECKED_IN -> CANCELLED", () => {
    expect(isValidTransition(VisitStatus.CHECKED_IN, VisitStatus.CANCELLED)).toBe(true);
  });

  it("rejects EXPECTED -> CHECKED_OUT", () => {
    expect(isValidTransition(VisitStatus.EXPECTED, VisitStatus.CHECKED_OUT)).toBe(false);
  });

  it("rejects CHECKED_IN -> EXPECTED", () => {
    expect(isValidTransition(VisitStatus.CHECKED_IN, VisitStatus.EXPECTED)).toBe(false);
  });

  it("rejects CHECKED_IN -> NO_SHOW", () => {
    expect(isValidTransition(VisitStatus.CHECKED_IN, VisitStatus.NO_SHOW)).toBe(false);
  });

  it("rejects CHECKED_OUT -> CHECKED_IN (terminal)", () => {
    expect(isValidTransition(VisitStatus.CHECKED_OUT, VisitStatus.CHECKED_IN)).toBe(false);
  });

  it("rejects CHECKED_OUT -> EXPECTED (terminal)", () => {
    expect(isValidTransition(VisitStatus.CHECKED_OUT, VisitStatus.EXPECTED)).toBe(false);
  });

  it("rejects NO_SHOW -> CHECKED_IN (terminal)", () => {
    expect(isValidTransition(VisitStatus.NO_SHOW, VisitStatus.CHECKED_IN)).toBe(false);
  });

  it("rejects CANCELLED -> CHECKED_IN (terminal)", () => {
    expect(isValidTransition(VisitStatus.CANCELLED, VisitStatus.CHECKED_IN)).toBe(false);
  });

  it("rejects any transition to same status", () => {
    expect(isValidTransition(VisitStatus.EXPECTED, VisitStatus.EXPECTED)).toBe(false);
    expect(isValidTransition(VisitStatus.CHECKED_IN, VisitStatus.CHECKED_IN)).toBe(false);
  });
});

describe("getAllowedTransitions", () => {
  it("returns 3 targets for EXPECTED", () => {
    expect(getAllowedTransitions(VisitStatus.EXPECTED)).toEqual([
      VisitStatus.CHECKED_IN,
      VisitStatus.CANCELLED,
      VisitStatus.NO_SHOW,
    ]);
  });

  it("returns 2 targets for CHECKED_IN", () => {
    expect(getAllowedTransitions(VisitStatus.CHECKED_IN)).toEqual([
      VisitStatus.CHECKED_OUT,
      VisitStatus.CANCELLED,
    ]);
  });

  it("returns empty array for terminal statuses", () => {
    expect(getAllowedTransitions(VisitStatus.CHECKED_OUT)).toEqual([]);
    expect(getAllowedTransitions(VisitStatus.NO_SHOW)).toEqual([]);
    expect(getAllowedTransitions(VisitStatus.CANCELLED)).toEqual([]);
  });
});
