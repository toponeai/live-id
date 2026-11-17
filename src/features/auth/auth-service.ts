export function normalizePhoneInput(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";

  const digitsOnly = trimmed.replace(/\D/g, "");
  if (!digitsOnly) return "";

  if (trimmed.startsWith("+")) return `+${digitsOnly}`;
  if (trimmed.startsWith("00")) return `+${digitsOnly.slice(2)}`;

  return `+${digitsOnly}`;
}

export function assertPhoneIsUsable(raw: string): string {
  const normalized = normalizePhoneInput(raw);
  if (normalized.length < 9) {
    throw new Error("أدخل رقم هاتف بصيغة صحيحة مثل +966500000000");
  }
  return normalized;
}

export async function sendPhoneOtp(phone: string) {
  const formatted = assertPhoneIsUsable(phone);

  const { supabase } = await import("@/integrations/supabase/client");
  const { error } = await supabase.auth.signInWithOtp({
    phone: formatted,
  });

  if (error) {
    throw new Error(error.message || "فشل إرسال رمز التحقق");
  }

  return { phone: formatted };
}

export async function verifyPhoneOtp(phone: string, token: string) {
  const formatted = assertPhoneIsUsable(phone);
  const cleanedToken = token.trim();

  if (!cleanedToken) {
    throw new Error("أدخل رمز التحقق الذي وصلك");
  }

  const { supabase } = await import("@/integrations/supabase/client");
  const { data, error } = await supabase.auth.verifyOtp({
    phone: formatted,
    token: cleanedToken,
    type: "sms",
  });

  if (error) {
    throw new Error(error.message || "رمز التحقق غير صحيح أو منتهي");
  }

  return data.session;
}
