import { describe, expect, it } from "vitest";

import {
  INITIAL_IDENTITIES,
  isAvailableCountryUsername,
  makeToponeId,
  normalizeUsername,
} from "@/lib/topone-identifiers";

describe("TOPONE country-scoped identifiers", () => {
  it("normalizes the service, country, and username to a stable uppercase ID", () => {
    expect(makeToponeId("EG", " id.eg.topone ")).toBe("ID.EG.TOPONE");
  });

  it("allows the same username in a different country", () => {
    expect(isAvailableCountryUsername("SA", "OMAR", INITIAL_IDENTITIES)).toBe(true);
  });

  it("rejects duplicate usernames in the same country regardless of case", () => {
    expect(isAvailableCountryUsername("EG", "omar", INITIAL_IDENTITIES)).toBe(false);
  });

  it("rejects usernames that are too short or contain unsupported characters", () => {
    expect(isAvailableCountryUsername("EG", "A", INITIAL_IDENTITIES)).toBe(false);
    expect(normalizeUsername("A @ B")).toBe("AB");
  });
});