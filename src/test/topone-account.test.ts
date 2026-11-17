import { describe, expect, it } from "vitest";

import { normalizeE164Phone, orderedConversationUsers } from "@/lib/topone-account";

describe("TOPONE account helpers", () => {
  it("accepts an international phone number and removes common formatting", () => {
    expect(normalizeE164Phone("+20 (100) 123-4567")).toBe("+201001234567");
  });

  it("rejects phone numbers without a country prefix or outside E.164 length", () => {
    expect(normalizeE164Phone("01001234567")).toBeNull();
    expect(normalizeE164Phone("+1234567")).toBeNull();
    expect(normalizeE164Phone("+1234567890123456")).toBeNull();
  });

  it("orders both conversation members consistently", () => {
    expect(orderedConversationUsers("b-user", "a-user")).toEqual({ user_a: "a-user", user_b: "b-user" });
    expect(orderedConversationUsers("a-user", "b-user")).toEqual({ user_a: "a-user", user_b: "b-user" });
  });
});