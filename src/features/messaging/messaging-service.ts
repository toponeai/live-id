import { supabase } from "@/integrations/supabase/client";

export type ConversationRow = {
  id: string;
  user_a: string;
  user_b: string;
  created_by: string;
  created_at: string;
};

export type MessageRow = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  read_at: string | null;
  created_at: string;
};

export async function listConversationsForUser(userId: string) {
  const { data, error } = await supabase
    .from("conversations")
    .select("*")
    .or(`user_a.eq.${userId},user_b.eq.${userId}`)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) throw new Error(error.message || "تعذّر تحميل المحادثات");
  return (data ?? []) as ConversationRow[];
}

export async function listMessagesForConversation(conversationId: string) {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(200);

  if (error) throw new Error(error.message || "تعذّر تحميل الرسائل");
  return (data ?? []) as MessageRow[];
}

export async function sendMessageToConversation(conversationId: string, senderId: string, body: string) {
  const trimmed = body.trim();
  if (!trimmed) return false;

  const { error } = await supabase.from("messages").insert({
    conversation_id: conversationId,
    sender_id: senderId,
    body: trimmed,
  });

  if (error) throw new Error(error.message || "تعذّر إرسال الرسالة");
  return true;
}

export async function createConversationForUsers(userA: string, userB: string, createdBy: string) {
  const [first, second] = userA < userB ? [userA, userB] : [userB, userA];
  const { data, error } = await supabase
    .from("conversations")
    .insert({
      user_a: first,
      user_b: second,
      created_by: createdBy,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message || "تعذّر إنشاء المحادثة");
  return data as ConversationRow;
}

export async function canMessageBetween(senderId: string, recipientId: string) {
  const { data, error } = await supabase.rpc("topone_can_message", {
    _sender: senderId,
    _recipient: recipientId,
  });

  if (error) throw new Error(error.message || "تعذّر التحقق من صلاحية المحادثة");
  return Boolean(data);
}
