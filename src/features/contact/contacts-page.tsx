import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Ban, Check, LoaderCircle, Search, UserRound, UserRoundPlus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ToponeAuthContext } from "@/routes/__root";
import { supabase } from "@/integrations/supabase/client";
import { makeToponeId, type CountryCode } from "@/lib/topone-identifiers";
import { respondToContactRequest, sendContactRequest, toggleUserBlock } from "@/features/contact/contact-service";

type Profile = {
  user_id: string;
  username: string;
  display_name: string;
  country_code: string;
  discoverable: boolean;
  avatar_url: string | null;
};

type ContactRequest = {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: string;
  created_at: string;
};

export function ContactsPage() {
  const auth = useContext(ToponeAuthContext);
  const user = auth?.user ?? null;
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [requests, setRequests] = useState<ContactRequest[]>([]);
  const [blockedIds, setBlockedIds] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    const [profilesResult, requestsResult, blocksResult] = await Promise.all([
      supabase.from("profiles").select("user_id, username, display_name, country_code, discoverable, avatar_url")
        .eq("discoverable", true).neq("user_id", user.id).limit(100),
      supabase.from("contact_requests").select("id, sender_id, receiver_id, status, created_at")
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`).order("created_at", { ascending: false }).limit(200),
      supabase.from("user_blocks").select("blocked_id").eq("blocker_id", user.id),
    ]);

    if (profilesResult.error || requestsResult.error || blocksResult.error) {
      setError("تعذّر تحميل جهات الاتصال. تحقق من اتصال الخدمة وسياسات الوصول، ثم أعد المحاولة.");
    }
    setProfiles(profilesResult.data ?? []);
    setRequests(requestsResult.data ?? []);
    setBlockedIds((blocksResult.data ?? []).map((row) => row.blocked_id));
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (!auth?.authReady) return;
    if (!user) {
      setLoading(false);
      setProfiles([]);
      setRequests([]);
      setBlockedIds([]);
      return;
    }
    void refresh();
  }, [auth?.authReady, refresh, user]);

  const profilesById = useMemo(() => new Map(profiles.map((profile) => [profile.user_id, profile])), [profiles]);
  const incoming = requests.filter((request) => request.receiver_id === user?.id && request.status === "pending");
  const outgoingIds = new Set(requests.filter((request) => request.sender_id === user?.id && request.status === "pending").map((request) => request.receiver_id));
  const acceptedContacts = requests
    .filter((request) => request.status === "accepted")
    .map((request) => request.sender_id === user?.id ? request.receiver_id : request.sender_id)
    .filter((id, index, list) => list.indexOf(id) === index && !blockedIds.includes(id))
    .map((id) => profilesById.get(id))
    .filter((profile): profile is Profile => Boolean(profile));
  const matchingProfiles = profiles.filter((profile) => {
    const haystack = `${profile.display_name} ${profile.username} ${makeToponeId(profile.country_code as CountryCode, profile.username)}`.toLocaleUpperCase();
    return haystack.includes(query.trim().toLocaleUpperCase());
  });

  const perform = async (targetId: string, operation: () => Promise<unknown>, success: string) => {
    setBusyId(targetId);
    setError(null);
    setNotice(null);
    try {
      await operation();
      setNotice(success);
      await refresh();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "تعذّر تنفيذ العملية. تحقق من صلاحيات الحساب.");
    } finally {
      setBusyId(null);
    }
  };

  if (!auth?.authReady || loading) {
    return <main className="grid min-h-screen place-items-center bg-background text-muted-foreground" dir="rtl"><LoaderCircle className="me-2 size-5 animate-spin" /> جارٍ تحميل جهات الاتصال...</main>;
  }

  if (!user) {
    return (
      <main className="grid min-h-screen place-items-center bg-background p-6 text-center" dir="rtl">
        <section className="max-w-md rounded-xl border bg-card p-6">
          <h1 className="text-xl font-bold">سجّل الدخول أولًا</h1>
          <p className="mt-2 text-sm text-muted-foreground">تحتاج إلى حساب موثّق لإدارة طلبات التواصل وجهات الاتصال.</p>
          <Link className="mt-5 inline-flex rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground" to="/auth/phone">تسجيل الدخول</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background px-4 py-6 text-foreground sm:px-7" dir="rtl">
      <div className="mx-auto max-w-3xl">
        <header className="mb-6 flex items-center justify-between gap-3 border-b pb-4">
          <div>
            <Link to="/app" className="mb-3 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> العودة إلى الحساب</Link>
            <h1 className="text-2xl font-bold">جهات الاتصال</h1>
            <p className="mt-1 text-sm text-muted-foreground">طلبات التواصل والأصدقاء والحسابات المحظورة.</p>
          </div>
          <UserRound className="size-7 text-primary" aria-hidden="true" />
        </header>

        {error && <p role="alert" className="mb-4 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}
        {notice && <p role="status" className="mb-4 rounded-md border border-primary/30 bg-primary/5 p-3 text-sm">{notice}</p>}
        <div className="mb-7 flex justify-end"><Button variant="outline" onClick={() => void refresh()} disabled={loading}>تحديث البيانات</Button></div>

        <section className="mb-8">
          <h2 className="mb-3 text-lg font-semibold">الطلبات الواردة <span className="text-sm text-muted-foreground">({incoming.length})</span></h2>
          {incoming.length === 0 ? <p className="rounded-lg border border-dashed p-5 text-sm text-muted-foreground">لا توجد طلبات واردة حاليًا.</p> : (
            <ul className="divide-y rounded-lg border px-4">
              {incoming.map((request) => {
                const sender = profilesById.get(request.sender_id);
                return (
                  <li key={request.id} className="flex flex-wrap items-center gap-3 py-4">
                    <div className="min-w-0 flex-1"><p className="font-medium">{sender?.display_name ?? "مستخدم TOPONE"}</p><p dir="ltr" className="text-start font-mono text-xs text-muted-foreground">{sender ? makeToponeId(sender.country_code as CountryCode, sender.username) : "TOPONE ID"}</p></div>
                    <Button size="sm" disabled={busyId === request.id} onClick={() => void perform(request.id, () => respondToContactRequest(request.id, "accepted"), "تم قبول الطلب.")}><Check className="size-4" /> قبول</Button>
                    <Button size="sm" variant="outline" disabled={busyId === request.id} onClick={() => void perform(request.id, () => respondToContactRequest(request.id, "declined"), "تم رفض الطلب.")}><X className="size-4" /> رفض</Button>
                    <Button size="sm" variant="ghost" disabled={busyId === request.sender_id} onClick={() => void perform(request.sender_id, () => toggleUserBlock(user.id, request.sender_id), "تم تحديث قائمة الحظر.")}><Ban className="size-4" /> حظر</Button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="mb-8">
          <h2 className="mb-3 text-lg font-semibold">جهات الاتصال المقبولة <span className="text-sm text-muted-foreground">({acceptedContacts.length})</span></h2>
          {acceptedContacts.length === 0 ? <p className="rounded-lg border border-dashed p-5 text-sm text-muted-foreground">ستظهر جهات الاتصال هنا بعد قبول الطلبات.</p> : (
            <ul className="divide-y rounded-lg border px-4">
              {acceptedContacts.map((person) => (
                <li key={person.user_id} className="flex flex-wrap items-center gap-3 py-4">
                  <div className="min-w-0 flex-1"><p className="font-medium">{person.display_name}</p><p dir="ltr" className="text-start font-mono text-xs text-muted-foreground">{makeToponeId(person.country_code as CountryCode, person.username)}</p></div>
                  <Button size="sm" variant="outline" disabled={busyId === person.user_id} onClick={() => void perform(person.user_id, () => toggleUserBlock(user.id, person.user_id), "تم تحديث قائمة الحظر.")}><Ban className="size-4" /> حظر</Button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mb-8">
          <h2 className="mb-3 text-lg font-semibold">اكتشف أشخاصًا</h2>
          <label className="relative mb-4 block"><Search className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input className="pe-10" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ابحث بالاسم أو بمعرّف TOPONE" /></label>
          {matchingProfiles.length === 0 ? <p className="rounded-lg border border-dashed p-5 text-sm text-muted-foreground">لا توجد نتائج ظاهرة. قد يكون المستخدم عطّل الاكتشاف.</p> : (
            <ul className="divide-y rounded-lg border px-4">
              {matchingProfiles.filter((person) => !blockedIds.includes(person.user_id)).map((person) => {
                const requested = outgoingIds.has(person.user_id);
                return (
                  <li key={person.user_id} className="flex flex-wrap items-center gap-3 py-4">
                    <div className="min-w-0 flex-1"><p className="font-medium">{person.display_name}</p><p dir="ltr" className="text-start font-mono text-xs text-muted-foreground">{makeToponeId(person.country_code as CountryCode, person.username)}</p></div>
                    <Button size="sm" disabled={requested || busyId === person.user_id} onClick={() => void perform(person.user_id, () => sendContactRequest(user.id, person.user_id), requested ? "تم إرسال الطلب مسبقًا." : "تم إرسال طلب التواصل.")}>
                      <UserRoundPlus className="size-4" /> {requested ? "قيد الانتظار" : "إضافة"}
                    </Button>
                    <Button size="sm" variant="ghost" disabled={busyId === person.user_id} onClick={() => void perform(person.user_id, () => toggleUserBlock(user.id, person.user_id), "تم تحديث قائمة الحظر.")}><Ban className="size-4" /> حظر</Button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold">المستخدمون المحظورون <span className="text-sm text-muted-foreground">({blockedIds.length})</span></h2>
          {blockedIds.length === 0 ? <p className="rounded-lg border border-dashed p-5 text-sm text-muted-foreground">لا يوجد مستخدمون محظورون.</p> : (
            <ul className="divide-y rounded-lg border px-4">
              {blockedIds.map((blockedId) => {
                const blocked = profilesById.get(blockedId);
                return <li key={blockedId} className="flex items-center gap-3 py-4"><span className="min-w-0 flex-1">{blocked?.display_name ?? "مستخدم TOPONE"}</span><Button variant="outline" size="sm" disabled={busyId === blockedId} onClick={() => void perform(blockedId, () => toggleUserBlock(user.id, blockedId), "تم إلغاء الحظر.")}>إلغاء الحظر</Button></li>;
              })}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
