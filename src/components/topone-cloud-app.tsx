import { useCallback, useContext, useEffect, useMemo, useState, type FormEvent } from "react";
import { AudioLines, Bell, Check, Globe2, Heart, LockKeyhole, LogOut, MessageCircle, Phone, Search, Send, ShieldCheck, UserPlus, UsersRound, Video, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { ToponeAuthContext } from "@/routes/__root";
import { makeToponeId, normalizeUsername, type CountryCode } from "@/lib/topone-identifiers";
import { normalizeE164Phone, orderedConversationUsers, type UiLanguage } from "@/lib/topone-account";

type Screen = "home" | "search" | "messages" | "contacts" | "settings";
type Profile = { user_id: string; username: string; display_name: string; country_code: string; discoverable: boolean; avatar_url: string | null };
type ProfileSettings = { language_code: string; message_privacy: string; allow_contact_requests: boolean };
type ChatMessage = { id: string; conversation_id: string; sender_id: string; body: string; read_at: string | null; created_at: string };
type Conversation = { id: string; user_a: string; user_b: string; created_by: string; created_at: string };
type ContactRequest = { id: string; sender_id: string; receiver_id: string; status: string; created_at: string };

const copy = {
  ar: {
    app: "TOPONE", tagline: "تواصل بمعرّفك", signIn: "دخول برقم الهاتف", phone: "رقم الهاتف الدولي", phoneHint: "+20 100 123 4567", name: "اسمك الظاهر", sendCode: "إرسال رمز التحقق", code: "رمز التحقق", verify: "تأكيد الدخول", back: "تغيير الرقم", smsSetup: "يتطلب إرسال رمز الدخول إعداد مزود رسائل SMS في إعدادات الحسابات. قد تُطبق رسوم من مزود الرسائل.",
    home: "الرئيسية", search: "بحث", messages: "الرسائل", contacts: "جهات الاتصال", settings: "الملف والخصوصية", hello: "مرحبًا", yourId: "معرّفك", discover: "ابحث عن الأشخاص", query: "اسم المستخدم أو معرّف TOPONE", sendRequest: "إضافة", requested: "تم الإرسال", call: "مكالمة تجريبية", video: "فيديو تجريبي", noCalls: "المكالمات الصوتية والمرئية غير مهيأة بعد.",
    profile: "الملف الشخصي", username: "اسم المستخدم", country: "رمز الدولة", save: "حفظ التغييرات", phonePrivate: "رقمك موثّق للحساب ولا يظهر للآخرين.", privacy: "الخصوصية", discoverable: "السماح بالعثور على ملفي", allowRequests: "السماح بطلبات التواصل", whoMessages: "من يستطيع مراسلتي", everyone: "الجميع", contactsOnly: "جهات اتصالي فقط", language: "اللغة", arabic: "العربية", english: "English", block: "حظر", unblock: "إلغاء الحظر", blocked: "المحظورون", requests: "طلبات التواصل", accept: "قبول", decline: "رفض", noRequests: "لا توجد طلبات جديدة.", noContacts: "أضف أشخاصًا لبدء التواصل.", noChats: "لا توجد محادثات بعد.", selectChat: "اختر محادثة أو ابحث عن شخص.", messageHint: "اكتب رسالة…", send: "إرسال", signOut: "تسجيل الخروج", loading: "جارٍ التحميل…", noResults: "لا توجد نتائج.", saved: "تم حفظ التغييرات.", error: "تعذر إكمال العملية. حاول مرة أخرى.", signInError: "تعذر إرسال الرمز. تأكد من إعداد رسائل SMS ورقم الهاتف.", verifyError: "الرمز غير صحيح أو انتهت صلاحيته.", callLabel: "المكالمات قيد التجربة", voiceLabel: "لا يوجد صوت حي أو فيديو متصل حتى الآن.", account: "حسابك", privacyHint: "لا يطّلع أحد على رقم هاتفك. اختر من يستطيع اكتشافك ومراسلتك.", signInHeading: "حسابك، برقمك", signInCaption: "سجّل برقم هاتفك، ثم شارك معرّف TOPONE بدل رقمك.", status: "متصل بالحساب", addContact: "إرسال طلب تواصل", blockDone: "تم تحديث قائمة الحظر.", newChat: "مراسلة", unread: "غير مقروءة",
  },
  en: {
    app: "TOPONE", tagline: "Connect by your ID", signIn: "Sign in with phone", phone: "International phone number", phoneHint: "+1 415 555 0134", name: "Display name", sendCode: "Send verification code", code: "Verification code", verify: "Verify and sign in", back: "Change number", smsSetup: "SMS sign-in requires an SMS provider in account settings. Your SMS provider may charge for messages.",
    home: "Home", search: "Search", messages: "Messages", contacts: "Contacts", settings: "Profile & privacy", hello: "Hello", yourId: "Your ID", discover: "Find people", query: "Username or TOPONE ID", sendRequest: "Add", requested: "Sent", call: "Demo call", video: "Demo video", noCalls: "Live voice and video are not configured yet.",
    profile: "Profile", username: "Username", country: "Country code", save: "Save changes", phonePrivate: "Your verified number is private and never shown to others.", privacy: "Privacy", discoverable: "Let people find my profile", allowRequests: "Allow contact requests", whoMessages: "Who can message me", everyone: "Everyone", contactsOnly: "My contacts only", language: "Language", arabic: "العربية", english: "English", block: "Block", unblock: "Unblock", blocked: "Blocked people", requests: "Contact requests", accept: "Accept", decline: "Decline", noRequests: "No new requests.", noContacts: "Add people to start connecting.", noChats: "No conversations yet.", selectChat: "Choose a conversation or find someone.", messageHint: "Write a message…", send: "Send", signOut: "Sign out", loading: "Loading…", noResults: "No results.", saved: "Changes saved.", error: "Could not complete that action. Try again.", signInError: "Could not send a code. Check SMS setup and the phone number.", verifyError: "That code is incorrect or expired.", callLabel: "Calls are in demo mode", voiceLabel: "No live audio or video service is connected yet.", account: "Your account", privacyHint: "Your phone number stays private. Choose who can find and message you.", signInHeading: "Your account, by phone", signInCaption: "Sign in with your phone, then share your TOPONE ID instead of your number.", status: "Account connected", addContact: "Send contact request", blockDone: "Blocked list updated.", newChat: "Message", unread: "Unread",
  },
} as const;

const COUNTRIES: { code: CountryCode; name: string; dialCode: string }[] = [
  { code: "EG", name: "مصر", dialCode: "+20" }, { code: "SA", name: "السعودية", dialCode: "+966" }, { code: "AE", name: "الإمارات", dialCode: "+971" }, { code: "JO", name: "الأردن", dialCode: "+962" }, { code: "KW", name: "الكويت", dialCode: "+965" }, { code: "GB", name: "United Kingdom", dialCode: "+44" }, { code: "US", name: "United States", dialCode: "+1" },
];

export function ToponeCloudApp() {
  const auth = useContext(ToponeAuthContext);
  const user = auth?.user ?? null;
  const [screen, setScreen] = useState<Screen>("home");
  const [language, setLanguage] = useState<UiLanguage>("ar");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [settings, setSettings] = useState<ProfileSettings | null>(null);
  const [people, setPeople] = useState<Profile[]>([]);
  const [requests, setRequests] = useState<ContactRequest[]>([]);
  const [blockedIds, setBlockedIds] = useState<string[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [search, setSearch] = useState("");
  const [messageDraft, setMessageDraft] = useState("");
  const [phone, setPhone] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [demoCall, setDemoCall] = useState<"audio" | "video" | null>(null);
  const [profileName, setProfileName] = useState("");
  const [profileUsername, setProfileUsername] = useState("");
  const [profileCountry, setProfileCountry] = useState<CountryCode>("EG");

  const t = copy[language];
  const myId = profile ? makeToponeId(profile.country_code as CountryCode, profile.username) : "";

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
  }, [language]);

  const refreshAccountData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [profileResult, settingsResult, peopleResult, requestResult, blockResult, conversationsResult] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("profile_settings").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("profiles").select("*").eq("discoverable", true).neq("user_id", user.id).limit(100),
      supabase.from("contact_requests").select("*").or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`).order("created_at", { ascending: false }).limit(100),
      supabase.from("user_blocks").select("blocked_id").eq("blocker_id", user.id),
      supabase.from("conversations").select("*").or(`user_a.eq.${user.id},user_b.eq.${user.id}`).order("created_at", { ascending: false }).limit(100),
    ]);
    if (profileResult.data) {
      setProfile(profileResult.data);
      setProfileName(profileResult.data.display_name);
      setProfileUsername(profileResult.data.username);
      setProfileCountry((profileResult.data.country_code || "EG") as CountryCode);
    }
    if (settingsResult.data) {
      setSettings(settingsResult.data);
      setLanguage(settingsResult.data.language_code === "en" ? "en" : "ar");
    }
    setPeople(peopleResult.data ?? []);
    setRequests(requestResult.data ?? []);
    setBlockedIds((blockResult.data ?? []).map((row) => row.blocked_id));
    setConversations(conversationsResult.data ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setSettings(null);
      setPeople([]);
      setConversations([]);
      setLoading(false);
      return;
    }
    void refreshAccountData();
  }, [refreshAccountData, user]);

  useEffect(() => {
    if (!user || !activeChat) return;
    let active = true;
    const loadMessages = async () => {
      const { data } = await supabase.from("messages").select("*").eq("conversation_id", activeChat).order("created_at", { ascending: true }).limit(200);
      if (active) setMessages(data ?? []);
    };
    void loadMessages();
    const channel = supabase.channel(`topone-messages-${activeChat}-${crypto.randomUUID()}`).on("postgres_changes", { event: "*", schema: "public", table: "messages", filter: `conversation_id=eq.${activeChat}` }, () => void loadMessages()).subscribe();
    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [activeChat, user]);

  const visiblePeople = useMemo(() => {
    const query = search.trim().toLocaleUpperCase();
    if (!query) return people;
    return people.filter((person) => [person.display_name, person.username, makeToponeId(person.country_code as CountryCode, person.username)].some((value) => value.toLocaleUpperCase().includes(query)));
  }, [people, search]);

  const submitPhone = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    const internationalPhone = normalizeE164Phone(phone);
    if (!internationalPhone) {
      setError(language === "ar" ? "اكتب الرقم بصيغة دولية مثل +201001234567." : "Enter a full international number, such as +12025550123.");
      return;
    }
    setBusy(true);
    const { error: authError } = await supabase.auth.signInWithOtp({ phone: internationalPhone, options: { shouldCreateUser: true, data: { display_name: displayName.trim() || "TOPONE" } } });
    setBusy(false);
    if (authError) setError(t.signInError);
    else setOtpSent(true);
  };

  const verifyCode = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    const internationalPhone = normalizeE164Phone(phone);
    if (!internationalPhone) {
      setBusy(false);
      setError(t.signInError);
      return;
    }
    const { error: authError } = await supabase.auth.verifyOtp({ phone: internationalPhone, token: otp.trim(), type: "sms" });
    setBusy(false);
    if (authError) setError(t.verifyError);
  };

  const saveProfile = async () => {
    if (!user || !profile) return;
    const normalized = normalizeUsername(profileUsername);
    if (!/^[A-Z0-9][A-Z0-9_.-]{1,19}$/.test(normalized)) {
      setError(language === "ar" ? "اسم المستخدم من حرفين إلى 20 حرفًا." : "Usernames must be 2–20 letters, numbers, dots, underscores, or hyphens.");
      return;
    }
    setBusy(true);
    setError("");
    const { data, error: updateError } = await supabase.from("profiles").update({ display_name: profileName.trim() || "TOPONE", username: normalized, country_code: profileCountry }).eq("user_id", user.id).select("*").single();
    setBusy(false);
    if (updateError) {
      setError(updateError.code === "23505" ? (language === "ar" ? "هذا الاسم مستخدم في الدولة المختارة." : "That username is already taken in this country.") : t.error);
      return;
    }
    setProfile(data);
    setNotice(t.saved);
  };

  const updateSettings = async (patch: Partial<ProfileSettings>) => {
    if (!user || !settings) return;
    const { data, error: updateError } = await supabase.from("profile_settings").update(patch).eq("user_id", user.id).select("*").single();
    if (updateError) setError(t.error);
    else if (data) {
      setSettings(data);
      if (patch.language_code) setLanguage(patch.language_code === "en" ? "en" : "ar");
    }
  };

  const sendContactRequest = async (person: Profile) => {
    if (!user) return;
    setError("");
    const { error: requestError } = await supabase.from("contact_requests").insert({ sender_id: user.id, receiver_id: person.user_id });
    if (requestError) setError(language === "ar" ? "لم يُرسل الطلب. قد يكون الشخص عطّل الطلبات أو حظرك." : "Request not sent. They may have disabled requests or blocked you.");
    else {
      setNotice(t.requested);
      await refreshAccountData();
    }
  };

  const respondToRequest = async (requestId: string, status: "accepted" | "declined") => {
    const { data, error: responseError } = await supabase.rpc("topone_respond_contact_request", { _request_id: requestId, _status: status });
    if (responseError || !data) setError(t.error);
    else await refreshAccountData();
  };

  const toggleBlock = async (personId: string) => {
    if (!user) return;
    const isBlocked = blockedIds.includes(personId);
    const result = isBlocked
      ? await supabase.from("user_blocks").delete().eq("blocker_id", user.id).eq("blocked_id", personId)
      : await supabase.from("user_blocks").insert({ blocker_id: user.id, blocked_id: personId });
    if (result.error) setError(t.error);
    else {
      setBlockedIds((current) => isBlocked ? current.filter((id) => id !== personId) : [...current, personId]);
      setNotice(t.blockDone);
    }
  };

  const openConversation = async (person: Profile) => {
    if (!user) return;
    const pair = orderedConversationUsers(user.id, person.user_id);
    const existing = conversations.find((chat) => chat.user_a === pair.user_a && chat.user_b === pair.user_b);
    if (existing) {
      setActiveChat(existing.id);
      setScreen("messages");
      return;
    }
    const { data, error: createError } = await supabase.from("conversations").insert({ ...pair, created_by: user.id }).select("*").single();
    if (createError || !data) {
      setError(language === "ar" ? "لا يمكن بدء المحادثة. قد تحتاج إلى قبول طلب التواصل أولًا." : "Can't start this conversation. A contact request may need to be accepted first.");
      return;
    }
    setConversations((current) => [data, ...current]);
    setActiveChat(data.id);
    setScreen("messages");
  };

  const sendMessage = async (event: FormEvent) => {
    event.preventDefault();
    if (!user || !activeChat || !messageDraft.trim()) return;
    const body = messageDraft.trim();
    setMessageDraft("");
    const { error: sendError } = await supabase.from("messages").insert({ conversation_id: activeChat, sender_id: user.id, body });
    if (sendError) {
      setMessageDraft(body);
      setError(language === "ar" ? "لم تُرسل الرسالة. تحقق من إعدادات الخصوصية وطلبات التواصل." : "Message not sent. Check privacy settings and contact requests.");
    }
  };

  const personForId = (id: string) => people.find((person) => person.user_id === id) ?? (profile?.user_id === id ? profile : null);
  const activeConversation = conversations.find((chat) => chat.id === activeChat) ?? null;
  const activePeer = activeConversation ? personForId(activeConversation.user_a === user?.id ? activeConversation.user_b : activeConversation.user_a) : null;
  const incomingRequests = requests.filter((request) => request.receiver_id === user?.id && request.status === "pending");
  const acceptedContacts = requests.filter((request) => request.status === "accepted").map((request) => personForId(request.sender_id === user?.id ? request.receiver_id : request.sender_id)).filter((person): person is Profile => Boolean(person));
  const requestedIds = new Set(requests.filter((request) => request.status === "pending").map((request) => request.sender_id === user?.id ? request.receiver_id : request.sender_id));

  if (!user) return (
    <main className="min-h-screen bg-background text-foreground" dir={language === "ar" ? "rtl" : "ltr"}>
      <div className="mx-auto flex min-h-screen w-full max-w-[520px] flex-col justify-center px-5 py-10">
        <header className="mb-10 flex items-center gap-3">
          <div className="grid size-12 place-items-center rounded-[14px] bg-primary text-primary-foreground"><AudioLines className="size-6" /></div>
          <div><p className="text-lg font-bold">{t.app}</p><p className="text-xs text-muted-foreground">{t.tagline}</p></div>
          <Button variant="ghost" size="icon" className="ms-auto" aria-label={t.language} onClick={() => setLanguage(language === "ar" ? "en" : "ar")}><Globe2 className="size-5" /></Button>
        </header>
        <h1 className="mb-2 text-2xl font-bold">{t.signInHeading}</h1>
        <p className="mb-7 text-sm leading-6 text-muted-foreground">{t.signInCaption}</p>
        {!otpSent ? <form className="grid gap-4" onSubmit={submitPhone}>
          <label className="grid gap-2 text-sm font-medium">{t.name}<Input autoComplete="name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} maxLength={50} className="h-12" /></label>
          <label className="grid gap-2 text-sm font-medium">{t.phone}<Input autoComplete="tel" type="tel" dir="ltr" required placeholder={t.phoneHint} value={phone} onChange={(event) => setPhone(event.target.value)} className="h-12 text-left" /></label>
          <p className="flex items-start gap-2 text-xs leading-5 text-muted-foreground"><LockKeyhole className="mt-0.5 size-4 shrink-0" />{t.phonePrivate}</p>
          <Button type="submit" disabled={busy} className="mt-2 h-12">{busy ? t.loading : t.sendCode}</Button>
          <p className="text-center text-xs leading-5 text-muted-foreground">{t.smsSetup}</p>
        </form> : <form className="grid gap-4" onSubmit={verifyCode}>
          <p className="text-sm text-muted-foreground" dir="ltr">{normalizeE164Phone(phone)}</p>
          <label className="grid gap-2 text-sm font-medium">{t.code}<Input autoComplete="one-time-code" inputMode="numeric" maxLength={8} required value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, ""))} className="h-12 text-center text-lg tracking-[0.2em]" /></label>
          <Button type="submit" disabled={busy || otp.length < 4} className="h-12">{busy ? t.loading : t.verify}</Button>
          <Button type="button" variant="ghost" onClick={() => { setOtpSent(false); setOtp(""); }}>{t.back}</Button>
        </form>}
        {error && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}
      </div>
    </main>
  );

  const navItems: { key: Screen; label: string; icon: typeof Search }[] = [
    { key: "home", label: t.home, icon: AudioLines }, { key: "search", label: t.search, icon: Search }, { key: "messages", label: t.messages, icon: MessageCircle }, { key: "contacts", label: t.contacts, icon: UsersRound }, { key: "settings", label: t.settings, icon: ShieldCheck },
  ];

  return (
    <main className="min-h-screen bg-background text-foreground" dir={language === "ar" ? "rtl" : "ltr"}>
      <div className="mx-auto min-h-screen max-w-[1080px] px-4 pb-24 pt-4 sm:px-7 sm:pt-6">
        <header className="mb-6 flex items-center gap-3 border-b border-border pb-4">
          <div className="grid size-10 place-items-center rounded-[13px] bg-primary text-primary-foreground"><AudioLines className="size-5" /></div>
          <div className="min-w-0"><p className="font-bold">{t.app}</p><p className="text-[11px] text-muted-foreground">{t.status}</p></div>
          <Button variant="ghost" size="icon" className="ms-auto" onClick={() => setScreen("contacts")} aria-label={t.requests} title={t.requests}><Bell className="size-5" />{incomingRequests.length > 0 && <span className="absolute ms-5 mt-[-18px] size-2 rounded-full bg-destructive" />}</Button>
        </header>
        {error && <div role="alert" className="mb-4 flex items-start justify-between gap-3 border-s-2 border-destructive bg-destructive/5 px-3 py-2 text-sm text-destructive"><span>{error}</span><Button variant="ghost" size="icon" className="-my-1 size-7" onClick={() => setError("")} aria-label="Dismiss"><X className="size-4" /></Button></div>}
        {notice && <div role="status" className="mb-4 flex items-start justify-between gap-3 border-s-2 border-primary bg-primary/5 px-3 py-2 text-sm"><span>{notice}</span><Button variant="ghost" size="icon" className="-my-1 size-7" onClick={() => setNotice("")} aria-label="Dismiss"><X className="size-4" /></Button></div>}
        {screen === "home" && <section className="topone-enter grid gap-7 pt-4 sm:pt-10">
          <div><p className="mb-1 text-sm text-muted-foreground">{t.hello}</p><h1 className="text-3xl font-bold">{profile?.display_name || "TOPONE"}</h1></div>
          <div className="flex items-center justify-between gap-4 border-y border-border py-4"><div className="min-w-0"><p className="mb-1 text-xs text-muted-foreground">{t.yourId}</p><p dir="ltr" className="truncate font-mono text-sm font-semibold">{myId || t.loading}</p></div><Button variant="outline" size="icon" aria-label="Copy ID" title="Copy ID" onClick={() => void navigator.clipboard.writeText(myId)}><Check className="size-4" /></Button></div>
          <p className="max-w-xl text-sm leading-6 text-muted-foreground">{t.privacyHint}</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Button variant="secondary" className="h-24 flex-col gap-3" onClick={() => setScreen("search")}><Search className="size-5" />{t.discover}</Button>
            <Button variant="secondary" className="h-24 flex-col gap-3" onClick={() => setScreen("messages")}><MessageCircle className="size-5" />{t.messages}</Button>
            <Button variant="secondary" className="h-24 flex-col gap-3" onClick={() => setScreen("contacts")}><UsersRound className="size-5" />{t.contacts}</Button>
            <Button variant="secondary" className="h-24 flex-col gap-3" onClick={() => setDemoCall("audio")}><Phone className="size-5" />{t.call}</Button>
            <Button variant="secondary" className="h-24 flex-col gap-3" onClick={() => setDemoCall("video")}><Video className="size-5" />{t.video}</Button>
            <Button variant="secondary" className="h-24 flex-col gap-3" onClick={() => setScreen("settings")}><ShieldCheck className="size-5" />{t.settings}</Button>
          </div>
          <div className="flex items-start gap-3 border-t border-border pt-4 text-xs leading-5 text-muted-foreground"><AudioLines className="mt-0.5 size-4 shrink-0 text-primary" /><p><strong className="font-semibold text-foreground">{t.callLabel}.</strong> {t.voiceLabel}</p></div>
        </section>}

        {screen === "search" && <section className="topone-enter pt-2"><h1 className="mb-4 text-xl font-bold">{t.discover}</h1><div className="relative mb-5"><Search className="pointer-events-none absolute start-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input autoFocus value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t.query} className="h-12 ps-11" /></div>
          {loading ? <p className="py-8 text-center text-sm text-muted-foreground">{t.loading}</p> : visiblePeople.length ? <div className="divide-y divide-border">{visiblePeople.map((person) => <PersonRow key={person.user_id} person={person} t={t} blocked={blockedIds.includes(person.user_id)} requested={requestedIds.has(person.user_id)} onRequest={() => void sendContactRequest(person)} onMessage={() => void openConversation(person)} onBlock={() => void toggleBlock(person.user_id)} />)}</div> : <p className="py-10 text-center text-sm text-muted-foreground">{t.noResults}</p>}
        </section>}

        {screen === "contacts" && <section className="topone-enter pt-2"><h1 className="mb-6 text-xl font-bold">{t.contacts}</h1>
          <h2 className="mb-2 text-sm font-semibold">{t.requests} · {incomingRequests.length}</h2>
          {incomingRequests.length ? <div className="mb-7 divide-y divide-border">{incomingRequests.map((request) => { const person = personForId(request.sender_id); return <div key={request.id} className="flex items-center gap-2 py-3"><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{person?.display_name ?? "TOPONE"}</p><p dir="ltr" className="truncate text-xs text-muted-foreground">{person ? makeToponeId(person.country_code as CountryCode, person.username) : ""}</p></div><Button size="sm" onClick={() => void respondToRequest(request.id, "accepted")}>{t.accept}</Button><Button size="icon" variant="ghost" aria-label={t.decline} onClick={() => void respondToRequest(request.id, "declined")}><X className="size-4" /></Button></div>; })}</div> : <p className="mb-7 text-sm text-muted-foreground">{t.noRequests}</p>}
          <h2 className="mb-2 text-sm font-semibold">{t.contacts} · {acceptedContacts.length}</h2>
          {acceptedContacts.length ? <div className="divide-y divide-border">{acceptedContacts.map((person) => <PersonRow key={person.user_id} person={person} t={t} blocked={blockedIds.includes(person.user_id)} onRequest={() => void sendContactRequest(person)} onMessage={() => void openConversation(person)} onBlock={() => void toggleBlock(person.user_id)} />)}</div> : <p className="text-sm text-muted-foreground">{t.noContacts}</p>}
          <h2 className="mb-2 mt-8 text-sm font-semibold">{t.blocked}</h2>
          {blockedIds.length ? <div className="divide-y divide-border">{blockedIds.map((id) => { const person = personForId(id); return <div key={id} className="flex items-center justify-between gap-3 py-3"><span className="truncate text-sm">{person?.display_name ?? id}</span><Button size="sm" variant="outline" onClick={() => void toggleBlock(id)}>{t.unblock}</Button></div>; })}</div> : <p className="text-sm text-muted-foreground">—</p>}
        </section>}

        {screen === "messages" && <section className="topone-enter pt-2"><h1 className="mb-4 text-xl font-bold">{t.messages}</h1><div className="grid min-h-[60vh] overflow-hidden border border-border sm:grid-cols-[minmax(180px,0.7fr)_minmax(0,1.3fr)]">
          <aside className={`${activeChat ? "hidden sm:block" : ""} border-b border-border sm:border-b-0 sm:border-e`}>
            {conversations.map((chat) => { const peerId = chat.user_a === user.id ? chat.user_b : chat.user_a; const peer = personForId(peerId); return <Button key={chat.id} variant={activeChat === chat.id ? "secondary" : "ghost"} className="h-auto w-full justify-start rounded-none px-3 py-4 text-start" onClick={() => setActiveChat(chat.id)}><div className="min-w-0"><p className="truncate text-sm font-semibold">{peer?.display_name ?? "TOPONE"}</p><p dir="ltr" className="mt-1 truncate font-mono text-[10px] text-muted-foreground">{peer ? makeToponeId(peer.country_code as CountryCode, peer.username) : ""}</p></div></Button>; })}
            {!conversations.length && <p className="p-4 text-sm text-muted-foreground">{t.noChats}</p>}
            <Button variant="outline" className="mx-3 my-2" onClick={() => setScreen("search")}><UserPlus className="me-2 size-4" />{t.newChat}</Button>
          </aside>
          <div className={`${activeChat ? "flex" : "hidden sm:flex"} min-h-[50vh] flex-col`}>
            {activeChat ? <><header className="border-b border-border px-4 py-3"><p className="font-semibold">{activePeer?.display_name ?? "TOPONE"}</p><p dir="ltr" className="font-mono text-[10px] text-muted-foreground">{activePeer ? makeToponeId(activePeer.country_code as CountryCode, activePeer.username) : ""}</p></header><div className="flex-1 space-y-3 overflow-y-auto p-4">{messages.map((message) => <div key={message.id} className={`max-w-[85%] rounded-[10px] px-3 py-2 text-sm ${message.sender_id === user.id ? "ms-auto bg-primary text-primary-foreground" : "me-auto bg-secondary text-secondary-foreground"}`}><p className="whitespace-pre-wrap break-words">{message.body}</p><p className="mt-1 text-end text-[9px] opacity-70">{new Date(message.created_at).toLocaleTimeString(language, { hour: "2-digit", minute: "2-digit" })}</p></div>)}</div><form className="flex gap-2 border-t border-border p-3" onSubmit={sendMessage}><Input value={messageDraft} onChange={(event) => setMessageDraft(event.target.value)} maxLength={4000} placeholder={t.messageHint} aria-label={t.messageHint} /><Button size="icon" aria-label={t.send} disabled={!messageDraft.trim()}><Send className="size-4" /></Button></form></> : <div className="m-auto px-5 text-center text-sm text-muted-foreground">{t.selectChat}</div>}
          </div>
        </div></section>}

        {screen === "settings" && <section className="topone-enter max-w-2xl pt-2"><h1 className="mb-6 text-xl font-bold">{t.settings}</h1><div className="mb-8 grid gap-4">
          <h2 className="text-sm font-semibold">{t.profile}</h2><label className="grid gap-2 text-sm">{t.name}<Input value={profileName} onChange={(event) => setProfileName(event.target.value)} maxLength={50} /></label>
          <label className="grid gap-2 text-sm">{t.country}<Select value={profileCountry} onValueChange={(value) => setProfileCountry(value as CountryCode)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{COUNTRIES.map((country) => <SelectItem key={country.code} value={country.code}>{country.name} · {country.code} · {country.dialCode}</SelectItem>)}</SelectContent></Select></label>
          <label className="grid gap-2 text-sm">{t.username}<div className="flex h-11 items-center overflow-hidden rounded-md border border-input bg-background" dir="ltr"><span className="px-3 font-mono text-xs text-muted-foreground">ID.{profileCountry}.</span><Input value={profileUsername} onChange={(event) => setProfileUsername(event.target.value.toUpperCase())} maxLength={20} className="h-10 rounded-none border-0 px-0 font-mono shadow-none focus-visible:ring-0" /></div></label>
          <p className="text-xs text-muted-foreground">{t.phonePrivate} <span dir="ltr" className="block pt-1 font-mono">{user.phone ?? ""}</span></p><Button onClick={() => void saveProfile()} disabled={busy} className="h-11">{busy ? t.loading : t.save}</Button>
        </div>
        {settings && <div className="grid gap-4 border-t border-border py-6"><h2 className="flex items-center gap-2 text-sm font-semibold"><ShieldCheck className="size-4" />{t.privacy}</h2><p className="text-xs leading-5 text-muted-foreground">{t.privacyHint}</p>
          <SettingSwitch label={t.discoverable} checked={profile?.discoverable ?? false} onCheckedChange={async (checked) => { if (!user) return; const { data, error: updateError } = await supabase.from("profiles").update({ discoverable: checked }).eq("user_id", user.id).select("*").single(); if (updateError) setError(t.error); else if (data) setProfile(data); }} />
          <SettingSwitch label={t.allowRequests} checked={settings.allow_contact_requests} onCheckedChange={(checked) => void updateSettings({ allow_contact_requests: checked })} />
          <label className="grid gap-2 text-sm">{t.whoMessages}<Select value={settings.message_privacy} onValueChange={(value) => void updateSettings({ message_privacy: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="everyone">{t.everyone}</SelectItem><SelectItem value="contacts">{t.contactsOnly}</SelectItem></SelectContent></Select></label>
          <label className="grid gap-2 text-sm">{t.language}<Select value={language} onValueChange={(value) => void updateSettings({ language_code: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ar">{t.arabic}</SelectItem><SelectItem value="en">{t.english}</SelectItem></SelectContent></Select></label>
          <Button variant="outline" className="mt-2 justify-start" onClick={async () => { await supabase.auth.signOut(); setScreen("home"); }}><LogOut className="me-2 size-4" />{t.signOut}</Button>
        </div>}
      </section>}

        <nav aria-label={language === "ar" ? "التنقل الرئيسي" : "Main navigation"} className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 px-2 pb-[max(8px,env(safe-area-inset-bottom))] pt-2 backdrop-blur-md">
          <div className="mx-auto flex max-w-[600px] items-center justify-around gap-1">{navItems.map(({ key, label, icon: Icon }) => <Button key={key} variant={screen === key ? "secondary" : "ghost"} onClick={() => setScreen(key)} className="flex h-14 min-w-0 flex-1 flex-col gap-1 rounded-[12px] px-1 text-[10px]" aria-current={screen === key ? "page" : undefined}><Icon className="size-5" /><span className="truncate">{label}</span></Button>)}</div>
        </nav>
      </div>
      {demoCall && <div className="fixed inset-0 z-[60] grid place-items-center bg-foreground/40 px-4" role="dialog" aria-modal="true" aria-label={t.callLabel}><div className="w-full max-w-sm border border-border bg-background p-6 text-center"><div className="mx-auto mb-4 grid size-14 place-items-center rounded-full bg-secondary">{demoCall === "audio" ? <Phone className="size-6" /> : <Video className="size-6" />}</div><h2 className="mb-2 font-bold">{t.callLabel}</h2><p className="mb-6 text-sm leading-6 text-muted-foreground">{t.noCalls} {t.voiceLabel}</p><Button variant="destructive" className="w-full" onClick={() => setDemoCall(null)}>{language === "ar" ? "إغلاق" : "Close"}</Button></div></div>}
    </main>
  );
}

function PersonRow({ person, t, blocked, requested, onRequest, onMessage, onBlock }: { person: Profile; t: (typeof copy)[UiLanguage]; blocked: boolean; requested?: boolean; onRequest: () => void; onMessage: () => void; onBlock: () => void }) {
  return <div className="flex min-w-0 items-center gap-3 py-3.5"><div className="grid size-10 shrink-0 place-items-center rounded-full bg-secondary text-secondary-foreground"><span className="font-semibold">{person.display_name.slice(0, 1)}</span></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{person.display_name}</p><p dir="ltr" className="truncate text-start font-mono text-[10px] text-muted-foreground">{makeToponeId(person.country_code as CountryCode, person.username)}</p></div><Button variant="ghost" size="icon" title={blocked ? t.unblock : t.block} aria-label={blocked ? t.unblock : t.block} onClick={onBlock}><Heart className={`size-4 ${blocked ? "fill-destructive text-destructive" : ""}`} /></Button><Button variant="secondary" size="icon" title={t.newChat} aria-label={t.newChat} onClick={onMessage}><MessageCircle className="size-4" /></Button><Button size="sm" variant="outline" onClick={onRequest} disabled={blocked || requested}>{requested ? t.requested : t.sendRequest}</Button></div>;
}

function SettingSwitch({ label, checked, onCheckedChange }: { label: string; checked: boolean; onCheckedChange: (checked: boolean) => void }) {
  return <label className="flex items-center justify-between gap-4 border-b border-border py-3 text-sm"><span>{label}</span><Switch checked={checked} onCheckedChange={onCheckedChange} /></label>;
}