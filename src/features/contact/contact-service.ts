import { supabase } from "@/integrations/supabase/client";

export type ContactStatus = "pending" | "accepted" | "declined";

export async function sendContactRequest(senderId: string, receiverId: string) {
  const { error } = await supabase.from("contact_requests").insert({
    sender_id: senderId,
    receiver_id: receiverId,
  });

  if (error) throw new Error(error.message || "تعذّر إرسال طلب التواصل");
  return true;
}

export async function respondToContactRequest(requestId: string, status: "accepted" | "declined") {
  const { data, error } = await supabase.rpc("topone_respond_contact_request", {
    _request_id: requestId,
    _status: status,
  });

  if (error || !data) throw new Error(error?.message || "تعذّر تحديث طلب التواصل");
  return data;
}

export async function toggleUserBlock(blockerId: string, blockedId: string) {
  const { data: existing, error: checkError } = await supabase
    .from("user_blocks")
    .select("blocked_id")
    .eq("blocker_id", blockerId)
    .eq("blocked_id", blockedId)
    .maybeSingle();

  if (checkError) throw new Error(checkError.message || "تعذّر قراءة حالة الحظر");

  if (existing) {
    const { error } = await supabase
      .from("user_blocks")
      .delete()
      .eq("blocker_id", blockerId)
      .eq("blocked_id", blockedId);

    if (error) throw new Error(error.message || "تعذّر إزالة الحظر");
    return false;
  }

  const { error } = await supabase.from("user_blocks").insert({
    blocker_id: blockerId,
    blocked_id: blockedId,
  });

  if (error) throw new Error(error.message || "تعذّر حظر المستخدم");
  return true;
}

export async function listContactRequestsForUser(userId: string) {
  const { data, error } = await supabase
    .from("contact_requests")
    .select("*")
    .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) throw new Error(error.message || "تعذّر جلب طلبات التواصل");
  return data ?? [];
}

export async function listBlockedIdsForUser(userId: string) {
  const { data, error } = await supabase
    .from("user_blocks")
    .select("blocked_id")
    .eq("blocker_id", userId);

  if (error) throw new Error(error.message || "تعذّر جلب قائمة الحظر");
  return (data ?? []).map((row) => row.blocked_id);
}
