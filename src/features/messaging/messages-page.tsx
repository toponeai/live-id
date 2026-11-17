import { useContext, useEffect, useMemo, useState } from "react";
import { ArrowLeft, LoaderCircle, MessageSquareText, SendHorizonal, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ToponeAuthContext } from "@/routes/__root";
import { supabase } from "@/integrations/supabase/client";
import { makeToponeId, type CountryCode } from "@/lib/topone-identifiers";
import { canMessageBetween, listConversationsForUser, listMessagesForConversation, sendMessageToConversation } from "@/features/messaging/messaging-service";

type Profile = {
  user_id: string;
  username: string;
  display_name: string;
  country_code: string;
  discoverable: boolean;
  avatar_url: string | null;
};

type Conversation = {
  id: string;
  user_a: string;
  user_b: string;
  created_by: string;
  created_at: string;
};

type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  read_at: string | null;
  created_at: string;
};

export function MessagesPage() {
  const auth = useContext(ToponeAuthContext);
  const user = auth?.user ?? null;
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshConversations = async () => {
    if (!user) return;
    const { data, error: listError } = await supabase
      .from("conversations")
      .select("*")
      .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
      .order("created_at", { ascending: false })
      .limit(100);

    if (listError) {
      setError(listError.message || "تعذّر تحميل المحادثات.");
      return;
    }

    const nextConversations = (data ?? []) as Conversation[];
    setConversations(nextConversations);
    if (!nextConversations.some((conversation) => conversation.id === selectedConversation)) {
      setSelectedConversation(nextConversations[0]?.id ?? null);
    }

    const userIds = Array.from(new Set(nextConversations.flatMap((conversation) => [conversation.user_a, conversation.user_b])));
    if (userIds.length === 0) {
      setProfiles({});
      return;
    }

    const { data: profileRows, error: profileError } = await supabase.from("profiles").select("user_id, username, display_name, country_code, discoverable, avatar_url").in("user_id", userIds);
    if (!profileError) {
      setProfiles(Object.fromEntries((profileRows ?? []).map((profile) => [profile.user_id, profile as Profile])));
    }
  };

  useEffect(() => {
    if (!auth?.authReady) return;
    if (!user) {
      setLoading(false);
      setConversations([]);
      setSelectedConversation(null);
      setMessages([]);
      return;
    }
    setLoading(true);
    void refreshConversations().finally(() => setLoading(false));
  }, [auth?.authReady, user]);

  useEffect(() => {
    if (!selectedConversation) {
      setMessages([]);
      return;
    }

    let active = true;
    const load = async () => {
      const { data, error: messageError } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", selectedConversation)
        .order("created_at", { ascending: true })
        .limit(200);

      if (active && !messageError) setMessages((data ?? []) as Message[]);
    };

    void load();
    const channel = supabase.channel(`messages-${selectedConversation}`).on("postgres_changes", { event: "*", schema: "public", table: "messages", filter: `conversation_id=eq.${selectedConversation}` }, (payload) => {
      if (payload.eventType === "INSERT" || payload.eventType === "UPDATE" || payload.eventType === "DELETE") {
        void load();
      }
    }).subscribe();

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [selectedConversation]);

  const selectedPeerId = useMemo(() => {
    if (!selectedConversation) return null;
    const conversation = conversations.find((item) => item.id === selectedConversation);
    if (!conversation || !user) return null;
    return conversation.user_a === user.id ? conversation.user_b : conversation.user_a;
  }, [conversations, selectedConversation, user]);

  const selectedPeer = selectedPeerId ? profiles[selectedPeerId] : null;

  const submit = async () => {
    if (!user || !selectedConversation || !draft.trim()) return;
    const peerId = selectedPeerId;
    if (!peerId) return;
    setBusy(true);
    setError(null);

    try {
      const allowed = await canMessageBetween(user.id, peerId);
      if (!allowed) {
        throw new Error("لا يمكنك إرسال رسالة إلى هذا المستخدم في الوقت الحالي. قد تكون المحادثة مغلقة أو غير مسموح بها.");
      }
      await sendMessageToConversation(selectedConversation, user.id, draft);
      setDraft("");
      await refreshConversations();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "تعذّر إرسال الرسالة.");
    } finally {
      setBusy(false);
    }
  };

  if (!auth?.authReady) {
    return <main className="grid min-h-screen place-items-center bg-background text-muted-foreground" dir="rtl"><LoaderCircle className="me-2 size-5 animate-spin" /> جارٍ التحضير...</main>;
  }

  if (!user) {
    return (
      <main className="grid min-h-screen place-items-center bg-background p-6 text-center" dir="rtl">
        <section className="max-w-md rounded-xl border bg-card p-6">
          <h1 className="text-xl font-bold">سجّل الدخول أولًا</h1>
          <p className="mt-2 text-sm text-muted-foreground">تحتاج إلى حساب نشط لعرض المحادثات والرسائل.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background px-4 py-6 text-foreground sm:px-7" dir="rtl">
      <div className="mx-auto max-w-5xl">
        <header className="mb-6 flex items-center justify-between gap-3 border-b pb-4">
          <div>
            <a href="/app" className="mb-3 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> العودة إلى الحساب</a>
            <h1 className="text-2xl font-bold">الرسائل</h1>
          </div>
          <MessageSquareText className="size-7 text-primary" aria-hidden="true" />
        </header>

        {error && <p role="alert" className="mb-4 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}

        <section className="grid min-h-[70vh] overflow-hidden rounded-xl border bg-card lg:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="border-b bg-muted/20 lg:border-b-0 lg:border-l">
            <div className="border-b px-4 py-3 font-semibold">المحادثات</div>
            <div className="space-y-2 p-3">
              {conversations.length === 0 && <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">لا توجد محادثات حتى الآن.</p>}
              {conversations.map((conversation) => {
                const peerId = conversation.user_a === user.id ? conversation.user_b : conversation.user_a;
                const peer = profiles[peerId];
                const active = selectedConversation === conversation.id;
                return (
                  <button key={conversation.id} type="button" onClick={() => setSelectedConversation(conversation.id)} className={`w-full rounded-lg border px-3 py-3 text-right transition ${active ? "border-primary bg-primary/5" : "border-transparent hover:bg-accent"}`}>
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium">{peer?.display_name ?? "TOPONE"}</span>
                      <UserRound className="size-4 text-muted-foreground" />
                    </div>
                    <div dir="ltr" className="mt-1 text-xs font-mono text-muted-foreground">{peer ? makeToponeId(peer.country_code as CountryCode, peer.username) : "ID"}</div>
                  </button>
                );
              })}
            </div>
          </aside>

          <div className="flex min-h-[420px] flex-col">
            {selectedPeer ? (
              <>
                <header className="border-b px-4 py-3">
                  <div className="font-semibold">{selectedPeer.display_name}</div>
                  <div dir="ltr" className="font-mono text-xs text-muted-foreground">{makeToponeId(selectedPeer.country_code as CountryCode, selectedPeer.username)}</div>
                </header>

                <div className="flex-1 space-y-3 overflow-y-auto p-4">
                  {messages.length === 0 ? <p className="text-sm text-muted-foreground">بدء المحادثة برسالة أولى.</p> : messages.map((message) => {
                    const isMine = message.sender_id === user.id;
                    return (
                      <div key={message.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${isMine ? "bg-primary text-primary-foreground" : "bg-accent text-accent-foreground"}`}>
                          {message.body}
                          <div className={`mt-1 text-[10px] ${isMine ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                            {new Date(message.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="border-t p-3">
                  <div className="flex gap-2">
                    <Input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="اكتب رسالة..." onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        void submit();
                      }
                    }} />
                    <Button onClick={() => void submit()} disabled={busy || !draft.trim()}>
                      <SendHorizonal className="size-4" /> إرسال
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="grid place-items-center p-10 text-sm text-muted-foreground">حدد محادثة للمتابعة.</div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
