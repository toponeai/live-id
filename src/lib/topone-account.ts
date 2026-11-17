export type UiLanguage = "ar" | "en";

export const normalizeE164Phone = (phone: string): string | null => {
  const normalized = phone.replace(/[\s()-]/g, "");
  return /^\+[1-9]\d{7,14}$/.test(normalized) ? normalized : null;
};

export const orderedConversationUsers = (first: string, second: string) =>
  first < second ? { user_a: first, user_b: second } : { user_a: second, user_b: first };