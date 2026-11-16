import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowDownLeft,
  ArrowUpRight,
  AudioLines,
  Bell,
  Check,
  ChevronLeft,
  Clock3,
  Command,
  ContactRound,
  Copy,
  Delete,
  Globe2,
  Heart,
  History,
  LayoutGrid,
  Mic,
  MicOff,
  Phone,
  PhoneCall,
  PhoneOff,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  UserRound,
  UsersRound,
  Volume2,
  VolumeX,
  WandSparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  COUNTRY_OPTIONS,
  INITIAL_IDENTITIES,
  isAvailableCountryUsername,
  makeToponeId,
  normalizeUsername,
  type CountryCode,
  type ToponeIdentity,
} from "@/lib/topone-identifiers";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TOPONE — اتصال يبدأ بمعرّفك" },
      { name: "description", content: "ابحث عن الأصدقاء، اتصل عبر الإنترنت، واحفظ معرّفات TOPONE المفضلة لديك." },
      { property: "og:title", content: "TOPONE — اتصال يبدأ بمعرّفك" },
      { property: "og:description", content: "ابحث واتصل بأصدقائك بمعرّف دولي بسيط." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ToponeApp,
});

type Section = "home" | "search" | "dial" | "history" | "contacts" | "settings";
type CallEntry = { id: string; direction: "outgoing" | "incoming"; when: string; duration: string };
type Profile = { displayName: string; username: string; countryCode: CountryCode };

const INITIAL_CALLS: CallEntry[] = [
  { id: "ID.EG.LAYLA", direction: "incoming", when: "اليوم · ١١:٣٢ ص", duration: "١٢ دقيقة" },
  { id: "ID.SA.OMAR", direction: "outgoing", when: "أمس · ٧:١٨ م", duration: "٥ دقائق" },
  { id: "ID.GB.NOUR", direction: "incoming", when: "أمس · ٢:٠٤ م", duration: "٢٧ دقيقة" },
];

const seedProfile: Profile = { displayName: "TOPONE", username: "TOPONE", countryCode: "EG" };
const digits = ["١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩", "*", "٠", "#"];
const iconButton = "h-10 w-10 shrink-0 rounded-full text-muted-foreground";

function ToponeApp() {
  const [section, setSection] = useState<Section>("home");
  const [profile, setProfile] = useState<Profile>(seedProfile);
  const [identities, setIdentities] = useState<ToponeIdentity[]>(INITIAL_IDENTITIES);
  const [history, setHistory] = useState<CallEntry[]>(INITIAL_CALLS);
  const [favorites, setFavorites] = useState<string[]>(["ID.EG.LAYLA", "ID.EG.OMAR"]);
  const [search, setSearch] = useState("");
  const [dialed, setDialed] = useState("");
  const [profileName, setProfileName] = useState(seedProfile.displayName);
  const [usernameInput, setUsernameInput] = useState(seedProfile.username);
  const [countryCode, setCountryCode] = useState<CountryCode>(seedProfile.countryCode);
  const [activeCall, setActiveCall] = useState<ToponeIdentity | null>(null);
  const [callElapsed, setCallElapsed] = useState(0);
  const [muted, setMuted] = useState(false);
  const [speaker, setSpeaker] = useState(false);
  const [copied, setCopied] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("topone-demo-v1");
      if (saved) {
        const data = JSON.parse(saved) as Partial<{
          profile: Profile;
          favorites: string[];
          history: CallEntry[];
          identities: ToponeIdentity[];
        }>;
        if (data.profile) {
          setProfile(data.profile);
          setProfileName(data.profile.displayName);
          setUsernameInput(data.profile.username);
          setCountryCode(data.profile.countryCode);
        }
        if (Array.isArray(data.favorites)) setFavorites(data.favorites);
        if (Array.isArray(data.history)) setHistory(data.history);
        if (Array.isArray(data.identities) && data.identities.length > 0) {
          setIdentities(data.identities);
        }
      }
    } catch {
      window.localStorage.removeItem("topone-demo-v1");
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(
      "topone-demo-v1",
      JSON.stringify({ profile, favorites, history, identities }),
    );
  }, [favorites, history, hydrated, identities, profile]);

  useEffect(() => {
    if (!activeCall) return;
    const timer = window.setInterval(() => setCallElapsed((elapsed) => elapsed + 1), 1000);
    return () => window.clearInterval(timer);
  }, [activeCall]);

  const myId = makeToponeId(profile.countryCode, profile.username);
  const savedContacts = identities.filter((person) => favorites.includes(person.id));
  const visiblePeople = useMemo(() => {
    const query = search.trim().toUpperCase();
    if (!query) return identities;
    return identities.filter((person) =>
      [person.displayName, person.id, person.username, person.countryCode]
        .join(" ")
        .toUpperCase()
        .includes(query),
    );
  }, [identities, search]);

  const toggleFavorite = (person: ToponeIdentity) => {
    setFavorites((current) =>
      current.includes(person.id)
        ? current.filter((id) => id !== person.id)
        : [...current, person.id],
    );
  };

  const startCall = (person: ToponeIdentity) => {
    setActiveCall(person);
    setCallElapsed(0);
    setMuted(false);
    setSpeaker(false);
    setHistory((current) => [
      { id: person.id, direction: "outgoing", when: "الآن · تجريبية", duration: "جارٍ الاتصال" },
      ...current.filter((item) => item.id !== person.id || item.when !== "الآن · تجريبية"),
    ]);
  };

  const endCall = () => {
    if (activeCall) {
      const minutes = Math.floor(callElapsed / 60);
      const seconds = callElapsed % 60;
      setHistory((current) =>
        current.map((item) =>
          item.id === activeCall.id && item.when === "الآن · تجريبية"
            ? { ...item, duration: `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}` }
            : item,
        ),
      );
    }
    setActiveCall(null);
    setCallElapsed(0);
  };

  const handleSaveProfile = () => {
    const normalized = normalizeUsername(usernameInput);
    if (!isAvailableCountryUsername(countryCode, normalized, identities, myId)) return;
    setIdentities((current) => {
      const updated = current.filter((person) => person.id !== myId);
      return [
        {
          id: makeToponeId(countryCode, normalized),
          username: normalized,
          displayName: profileName.trim() || "مستخدم TOPONE",
          countryCode,
          online: true,
          portrait: 0,
        },
        ...updated,
      ];
    });
    setProfile({ displayName: profileName.trim() || "مستخدم TOPONE", username: normalized, countryCode });
  };

  const handleCopyId = async () => {
    try {
      await navigator.clipboard.writeText(myId);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  const dialContact = useMemo(() => {
    const value = dialed.trim().toUpperCase();
    return identities.find((person) => person.id === value || person.username === value);
  }, [dialed, identities]);

  const title = {
    home: "الرئيسية",
    search: "اكتشف الأشخاص",
    dial: "لوحة الاتصال",
    history: "المحفوظات",
    contacts: "جهات الاتصال",
    settings: "حسابي",
  }[section];

  return (
    <main className="topone-shell min-h-screen text-foreground" dir="rtl">
      <div className="mx-auto flex min-h-screen max-w-[1480px] flex-col px-4 pb-28 pt-4 sm:px-7 sm:pt-6 lg:px-12">
        <header className="flex h-14 items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid size-10 shrink-0 place-items-center rounded-[15px] bg-primary text-primary-foreground">
              <AudioLines className="size-5" strokeWidth={2.4} />
            </div>
            <div className="min-w-0">
              <p className="truncate text-[17px] font-bold tracking-[0.02em]">TOPONE</p>
              <p className="hidden text-[11px] text-muted-foreground sm:block">صوتك أقرب، بمعرّف واحد</p>
            </div>
          </div>
          <div className="hidden items-center gap-2 rounded-full border border-topone-hairline bg-card/70 px-3 py-2 text-xs text-muted-foreground sm:flex">
            <span className="size-2 rounded-full bg-topone-positive" />
            جاهز للاتصال
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="relative h-10 w-10 rounded-full"
            aria-label="الإشعارات"
            title="الإشعارات"
            onClick={() => setSection("history")}
          >
            <Bell className="size-[19px]" />
            <span className="absolute right-2 top-2 size-2 rounded-full bg-accent-foreground" />
          </Button>
        </header>

        <div className="grid flex-1 grid-cols-1 gap-x-12 gap-y-6 pt-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.85fr)] lg:gap-y-8 lg:pt-10">
          <section className="topone-enter min-w-0 lg:col-start-2" aria-label="التعريف والمحتوى">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="mb-1 text-xs text-muted-foreground">مساء الخير،</p>
                <h1 className="text-[24px] font-bold sm:text-[28px]">{profile.displayName}</h1>
              </div>
              <Button variant="ghost" size="icon" className="h-11 w-11 rounded-full" aria-label="الملف الشخصي" title="الملف الشخصي" onClick={() => setSection("settings")}>
                <UserRound className="size-5" />
              </Button>
            </div>

            <div className="mb-6 flex items-center justify-between gap-3 border-y border-topone-hairline py-4">
              <div className="min-w-0">
                <p className="mb-1 text-[11px] text-muted-foreground">معرّف TOPONE الخاص بك</p>
                <p dir="ltr" className="truncate text-left font-mono text-[14px] font-semibold tracking-[0.06em]">{myId}</p>
              </div>
              <Button variant="outline" size="icon" className="h-10 w-10 shrink-0 rounded-full" onClick={handleCopyId} title="نسخ المعرّف" aria-label="نسخ المعرّف">
                {copied ? <Check className="size-4 text-topone-positive" /> : <Copy className="size-4" />}
              </Button>
            </div>

            <SectionTitle title={title} trailing={section === "home" ? <span className="text-xs text-muted-foreground">مساحتك الشخصية</span> : undefined} />
            {section === "home" && (
              <>
                <div className="relative mb-7 overflow-hidden rounded-[6px] bg-primary px-5 py-5 text-primary-foreground sm:px-7 sm:py-6">
                  <div className="relative z-10 max-w-[68%] sm:max-w-[72%]">
                    <p className="mb-2 text-xs opacity-80">مساحة قريبة من الجميع</p>
                    <h2 className="mb-3 text-[21px] font-bold leading-[1.5] sm:text-[25px]">مكالمة واحدة، وأنت أقرب</h2>
                    <p className="text-xs leading-6 opacity-85">معرّف واحد يكفي لتجد أصدقاءك في أي مكان.</p>
                  </div>
                  <div className="absolute -left-1 bottom-0 flex h-full w-[31%] items-end justify-center overflow-hidden opacity-75" aria-hidden="true">
                    <div className="mb-[-30px] grid size-32 place-items-center rounded-t-full border border-primary-foreground/20 bg-primary-foreground/10 sm:size-40">
                      <AudioLines className="size-12 sm:size-16" strokeWidth={1.2} />
                    </div>
                  </div>
                </div>

                <div className="mb-8">
                  <SectionTitle title="ابدأ من هنا" trailing={<Sparkles className="size-4 text-accent-foreground" />} />
                  <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
                    <QuickAction icon={<Search />} label="ابحث" caption="عن معرّف" onClick={() => setSection("search")} />
                    <QuickAction icon={<Command />} label="اتصل" caption="بأصدقائك" onClick={() => setSection("dial")} />
                    <QuickAction icon={<Heart />} label="مفضّلتك" caption={`${favorites.length} أشخاص`} onClick={() => setSection("contacts")} />
                  </div>
                </div>

                <div className="mb-7">
                  <SectionTitle title="الأقرب إليك" trailing={<Button variant="link" className="h-auto px-1 text-xs text-muted-foreground" onClick={() => setSection("contacts")}>الكل <ChevronLeft className="size-3.5" /></Button>} />
                  <div className="divide-y divide-topone-hairline/70">
                    {savedContacts.slice(0, 3).map((person) => <ContactRow key={person.id} person={person} onCall={startCall} onFavorite={toggleFavorite} favorite />)}
                  </div>
                </div>

                <div className="mb-4">
                  <SectionTitle title="آخر اتصال" trailing={<Button variant="link" className="h-auto px-1 text-xs text-muted-foreground" onClick={() => setSection("history")}>السجل <ChevronLeft className="size-3.5" /></Button>} />
                  <div className="divide-y divide-topone-hairline/70">
                    {history.slice(0, 2).map((entry, index) => <HistoryRow key={`${entry.id}-${index}`} entry={entry} person={identities.find((person) => person.id === entry.id)} onCall={() => findAndCall(entry.id, identities, startCall)} />)}
                  </div>
                </div>
              </>
            )}

            {section === "search" && (
              <>
                <p className="mb-5 text-sm leading-6 text-muted-foreground">ابحث بالاسم أو المعرّف الكامل، واعثر على أصحابك أينما كانوا.</p>
                <div className="relative mb-7">
                  <Search className="pointer-events-none absolute right-4 top-1/2 size-[18px] -translate-y-1/2 text-muted-foreground" />
                  <Input autoFocus value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ID.EG.TOPONE أو اسم المستخدم" className="h-12 rounded-full border-topone-hairline bg-card pr-11 text-sm" aria-label="البحث عن شخص" />
                  {search && <Button variant="ghost" size="icon" className="absolute left-1 top-1 h-10 w-10 rounded-full" onClick={() => setSearch("")} aria-label="مسح البحث"><Delete className="size-4" /></Button>}
                </div>
                <SectionTitle title={search ? `النتائج (${visiblePeople.length})` : "اقتراحات لك"} />
                {visiblePeople.length ? <div className="divide-y divide-topone-hairline/70">{visiblePeople.map((person) => <ContactRow key={person.id} person={person} favorite={favorites.includes(person.id)} onCall={startCall} onFavorite={toggleFavorite} />)}</div> : <EmptyState title="ما لقينا هذا المعرّف" caption="جرّب الاسم أو رمز الدولة من جديد." />}
                <PrototypeNotice />
              </>
            )}

            {section === "dial" && (
              <div className="mx-auto w-full max-w-[340px] pt-1 sm:max-w-[390px]">
                <div className="mb-5 flex h-[76px] items-center justify-center gap-2 border-b border-topone-hairline px-2">
                  <Input value={dialed} onChange={(event) => setDialed(event.target.value.toUpperCase())} placeholder="أدخل معرّف TOPONE" aria-label="المعرّف للاتصال" dir="ltr" className="h-11 min-w-0 border-0 bg-transparent text-center font-mono text-lg shadow-none focus-visible:ring-0" />
                  {dialed && <Button variant="ghost" size="icon" className={iconButton} onClick={() => setDialed("")} aria-label="مسح المعرّف"><Delete className="size-[18px]" /></Button>}
                </div>
                <div className="mb-6 grid grid-cols-3 gap-3 px-4 sm:px-8" dir="ltr">
                  {digits.map((digit, index) => <Button key={digit} type="button" variant="secondary" className="topone-key-button flex flex-col gap-0 text-foreground hover:bg-topone-soft" onClick={() => setDialed((current) => `${current}${digit === "٠" ? "0" : String(index < 9 ? index + 1 : digit === "*" ? "*" : digit === "#" ? "#" : 0)}`)}>
                    {digit}
                    {index < 9 && <span className="text-[9px] font-normal tracking-[0.07em] text-muted-foreground">{["", "ABC", "DEF", "GHI", "JKL", "MNO", "PQRS", "TUV", "WXYZ"][index + 1]}</span>}
                  </Button>)}
                </div>
                <div className="flex items-center justify-center gap-5">
                  <Button variant="ghost" size="icon" className="h-12 w-12 rounded-full text-muted-foreground" aria-label="رمز الدولة" title="اختر رمز الدولة"><Globe2 className="size-5" /></Button>
                  <Button onClick={() => dialContact ? startCall(dialContact) : setSection("search")} className="h-16 w-16 rounded-full bg-primary text-primary-foreground shadow-sm hover:bg-primary/90" aria-label="اتصال">
                    <PhoneCall className="size-6" />
                  </Button>
                  <span className="h-12 w-12" />
                </div>
                <PrototypeNotice />
              </div>
            )}

            {section === "history" && (
              <>
                <div className="mb-5 flex gap-2">
                  <span className="rounded-full bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground">الكل</span>
                  <span className="rounded-full px-3 py-1.5 text-xs text-muted-foreground">الواردة</span>
                  <span className="rounded-full px-3 py-1.5 text-xs text-muted-foreground">الصادرة</span>
                </div>
                {history.length ? <div className="divide-y divide-topone-hairline/70">{history.map((entry, index) => <HistoryRow key={`${entry.id}-${index}`} entry={entry} person={identities.find((person) => person.id === entry.id)} onCall={() => findAndCall(entry.id, identities, startCall)} />)}</div> : <EmptyState title="لا توجد مكالمات بعد" caption="ستظهر هنا مكالماتك الأخيرة." />}
                <PrototypeNotice />
              </>
            )}

            {section === "contacts" && (
              <>
                <div className="mb-5 flex gap-2 border-b border-topone-hairline pb-4">
                  <Button variant="secondary" className="h-9 rounded-full px-4 text-xs">المفضّلة · {favorites.length}</Button>
                  <Button variant="ghost" className="h-9 rounded-full px-4 text-xs text-muted-foreground">الكل · {identities.length}</Button>
                </div>
                <div className="divide-y divide-topone-hairline/70">{identities.map((person) => <ContactRow key={person.id} person={person} favorite={favorites.includes(person.id)} onCall={startCall} onFavorite={toggleFavorite} />)}</div>
                <PrototypeNotice />
              </>
            )}

            {section === "settings" && (
              <>
                <p className="mb-6 text-sm leading-6 text-muted-foreground">اختر الاسم الذي يبحث به أصدقاؤك عنك.</p>
                <div className="mb-8 grid gap-5">
                  <label className="grid gap-2 text-sm font-medium">اسمك الظاهر<Input value={profileName} onChange={(event) => setProfileName(event.target.value)} placeholder="الاسم" maxLength={50} className="h-12 rounded-[6px] bg-card" /></label>
                  <label className="grid gap-2 text-sm font-medium">رمز الدولة
                    <Select value={countryCode} onValueChange={(value) => setCountryCode(value as CountryCode)}>
                      <SelectTrigger className="h-12 rounded-[6px] bg-card"><SelectValue /></SelectTrigger>
                      <SelectContent>{COUNTRY_OPTIONS.map((country) => <SelectItem value={country.code} key={country.code}>{country.name} · {country.code} · {country.dialCode}</SelectItem>)}</SelectContent>
                    </Select>
                  </label>
                  <label className="grid gap-2 text-sm font-medium">اسم المستخدم
                    <div className="flex h-12 items-center overflow-hidden rounded-[6px] border border-input bg-card" dir="ltr">
                      <span className="shrink-0 px-3 font-mono text-xs text-muted-foreground">ID.{countryCode}.</span>
                      <Input value={usernameInput} onChange={(event) => setUsernameInput(event.target.value)} maxLength={20} aria-label="اسم المستخدم" className="h-11 min-w-0 rounded-none border-0 bg-transparent px-1 font-mono text-sm shadow-none focus-visible:ring-0" />
                    </div>
                  </label>
                  <p className="text-xs text-muted-foreground">معرّفك الجديد: <span dir="ltr" className="inline-block font-mono">{makeToponeId(countryCode, usernameInput)}</span></p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {isAvailableCountryUsername(countryCode, usernameInput, identities, myId)
                      ? <><Check className="size-4 text-topone-positive" /> الاسم متاح للتجربة</>
                      : <><ShieldCheck className="size-4 text-accent-foreground" /> اختَر اسمًا من حرفين أو أكثر، وغير مستخدم في الدولة</>}
                  </div>
                  <Button onClick={handleSaveProfile} disabled={!isAvailableCountryUsername(countryCode, usernameInput, identities, myId)} className="h-12 rounded-[6px]">حفظ التغييرات</Button>
                </div>
                <div className="topone-soft mb-5 flex items-start gap-3 rounded-[6px] p-4">
                  <WandSparkles className="mt-0.5 size-4 shrink-0 text-primary" />
                  <p className="text-xs leading-5 text-muted-foreground">اسم المستخدم يبقى نفسه في كل دولة؛ ورمز الدولة يجعل معرّف كل حساب مختلفًا.</p>
                </div>
                <PrototypeNotice />
              </>
            )}
          </section>

          <aside className="topone-enter hidden min-w-0 lg:col-start-1 lg:row-start-1 lg:block" aria-label="الاتصال">
            <div className="sticky top-8">
              <div className="mb-7 flex items-center justify-between border-b border-topone-hairline pb-4">
                <div>
                  <p className="mb-1 text-[11px] text-muted-foreground">مكانك لبدء مكالمة</p>
                  <h2 className="text-lg font-bold">لوحة الاتصال</h2>
                </div>
                <span className="rounded-full bg-secondary px-3 py-1.5 text-[10px] font-medium text-secondary-foreground">تجريبي</span>
              </div>
              <div className="mb-6 flex h-16 items-center gap-2 border-b border-topone-hairline">
                <Search className="size-4 shrink-0 text-muted-foreground" />
                <Input value={dialed} onChange={(event) => setDialed(event.target.value.toUpperCase())} placeholder="اكتب المعرّف للاتصال" aria-label="اكتب معرّف الاتصال" dir="ltr" className="h-12 border-0 bg-transparent text-left font-mono text-[13px] shadow-none focus-visible:ring-0" />
                {dialed && <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" onClick={() => setDialed("")} aria-label="مسح المعرّف"><Delete className="size-4" /></Button>}
              </div>
              {dialContact && <div className="mb-4"><ContactRow person={dialContact} favorite={favorites.includes(dialContact.id)} onCall={startCall} onFavorite={toggleFavorite} /></div>}
              <div className="mb-7 grid grid-cols-3 gap-3.5 px-6" dir="ltr">
                {digits.map((digit, index) => <Button key={digit} variant="secondary" className="topone-key-button flex flex-col gap-0 text-foreground hover:bg-topone-soft" onClick={() => setDialed((current) => `${current}${digit === "٠" ? "0" : String(index < 9 ? index + 1 : digit === "*" || digit === "#" ? digit : 0)}`)}>
                  {digit}<span className="text-[9px] font-normal tracking-[0.07em] text-muted-foreground">{index < 9 ? ["", "ABC", "DEF", "GHI", "JKL", "MNO", "PQRS", "TUV", "WXYZ"][index + 1] : ""}</span>
                </Button>)}
              </div>
              <div className="mb-8 flex items-center justify-center gap-5">
                <Button variant="ghost" size="icon" title="مسح الرقم" aria-label="مسح الرقم" className={iconButton} onClick={() => setDialed("")}><Delete className="size-[18px]" /></Button>
                <Button className="h-[62px] w-[62px] rounded-full bg-primary text-primary-foreground shadow-sm hover:bg-primary/90" aria-label="اتصال" onClick={() => dialContact ? startCall(dialContact) : setSection("search")}><PhoneCall className="size-6" /></Button>
                <Button variant="ghost" size="icon" title="جهات الاتصال" aria-label="جهات الاتصال" className={iconButton} onClick={() => setSection("contacts")}><ContactRound className="size-5" /></Button>
              </div>
              <div className="flex items-start gap-3 border-t border-topone-hairline pt-5">
                <div className="grid size-9 shrink-0 place-items-center rounded-full bg-topone-soft text-primary"><AudioLines className="size-4" /></div>
                <div><p className="mb-1 text-xs font-semibold">صوت واضح، أينما كنت</p><p className="max-w-[240px] text-[11px] leading-5 text-muted-foreground">سيعمل الصوت الحقيقي عند توصيل خادم المكالمات. هذه تجربة للواجهة فقط.</p></div>
              </div>
            </div>
          </aside>

          <aside className="hidden min-w-0 lg:col-start-2 lg:row-start-2 lg:block">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-topone-hairline py-5 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-2"><ShieldCheck className="size-4 text-topone-positive" /> معرّف خاص بك</span>
              <span className="h-3 w-px bg-topone-hairline" />
              <span className="flex items-center gap-2"><Globe2 className="size-4" /> من كل مكان</span>
              <span className="mr-auto">ID · TOPONE</span>
            </div>
          </aside>
        </div>

        <nav aria-label="التنقل الرئيسي" className="fixed inset-x-0 bottom-0 z-40 border-t border-topone-hairline bg-background/95 px-2 pb-[max(8px,env(safe-area-inset-bottom))] pt-2 backdrop-blur-md lg:fixed lg:inset-x-auto lg:bottom-8 lg:right-[max(16px,calc((100vw-1480px)/2+24px))] lg:top-1/2 lg:z-30 lg:w-[76px] lg:-translate-y-1/2 lg:rounded-[6px] lg:border lg:p-2">
          <div className="mx-auto flex max-w-[520px] items-center justify-around gap-1 lg:flex-col lg:gap-2">
            <NavItem active={section === "home"} label="الرئيسية" icon={<LayoutGrid />} onClick={() => setSection("home")} />
            <NavItem active={section === "search"} label="بحث" icon={<Search />} onClick={() => setSection("search")} />
            <Button onClick={() => setSection("dial")} className={`topone-nav-button min-w-[3.25rem] rounded-[17px] lg:my-2 ${section === "dial" ? "bg-accent text-accent-foreground hover:bg-accent/90" : "bg-primary text-primary-foreground hover:bg-primary/90"}`} aria-label="لوحة الاتصال" title="لوحة الاتصال"><Phone className="size-[20px]" /></Button>
            <NavItem active={section === "history"} label="المحفوظات" icon={<History />} onClick={() => setSection("history")} />
            <NavItem active={section === "contacts"} label="الأشخاص" icon={<UsersRound />} onClick={() => setSection("contacts")} />
          </div>
        </nav>
      </div>

      {activeCall && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-foreground/35 px-4 py-8 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="مكالمة تجريبية">
          <div className="topone-enter w-full max-w-[390px] rounded-[8px] border border-topone-hairline bg-background px-6 pb-6 pt-8 text-center shadow-xl sm:px-8">
            <div className="mx-auto mb-4 grid size-[76px] place-items-center rounded-full bg-topone-soft"><div className={`topone-portrait topone-portrait-${activeCall.portrait}`} /></div>
            <p className="mb-1 text-xl font-bold">{activeCall.displayName}</p>
            <p dir="ltr" className="mb-3 font-mono text-[12px] text-muted-foreground">{activeCall.id}</p>
            <div className="mb-8 flex items-center justify-center gap-2 text-xs text-topone-positive"><span className="size-2 animate-pulse rounded-full bg-topone-positive" /> مكالمة تجريبية · {formatCallTime(callElapsed)}</div>
            <div className="mb-7 flex items-center justify-center gap-5">
              <CallControl icon={muted ? <MicOff /> : <Mic />} label={muted ? "تشغيل المايك" : "كتم المايك"} active={muted} onClick={() => setMuted((value) => !value)} />
              <CallControl icon={speaker ? <Volume2 /> : <VolumeX />} label={speaker ? "إيقاف مكبر الصوت" : "مكبر الصوت"} active={speaker} onClick={() => setSpeaker((value) => !value)} />
            </div>
            <Button onClick={endCall} className="h-12 w-full rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"><PhoneOff className="size-4" /> إنهاء المكالمة</Button>
            <p className="mt-4 text-[10px] leading-5 text-muted-foreground">لا يتم إرسال صوت في هذه التجربة؛ المكالمة الحقيقية تتطلب تهيئة خدمة الاتصال.</p>
          </div>
        </div>
      )}
    </main>
  );
}

function SectionTitle({ title, trailing }: { title: string; trailing?: React.ReactNode }) {
  return <div className="mb-4 flex min-h-6 items-center justify-between gap-3"><h2 className="text-[14px] font-bold">{title}</h2>{trailing}</div>;
}

function QuickAction({ icon, label, caption, onClick }: { icon: React.ReactNode; label: string; caption: string; onClick: () => void }) {
  return <Button variant="secondary" onClick={onClick} className="flex h-[98px] min-w-0 flex-col items-start justify-between rounded-[6px] px-3.5 py-3 text-start text-secondary-foreground hover:bg-secondary/80 sm:h-[108px] sm:px-4">
    <span className="grid size-8 place-items-center rounded-full bg-background/65">{icon}</span>
    <span className="min-w-0 text-start"><span className="block truncate text-[12px] font-semibold sm:text-[13px]">{label}</span><span className="mt-0.5 block truncate text-[10px] font-normal opacity-70 sm:text-[11px]">{caption}</span></span>
  </Button>;
}

function ContactRow({ person, favorite, onCall, onFavorite }: { person: ToponeIdentity; favorite: boolean; onCall: (person: ToponeIdentity) => void; onFavorite: (person: ToponeIdentity) => void }) {
  const country = COUNTRY_OPTIONS.find((item) => item.code === person.countryCode);
  return <div className="flex min-w-0 items-center gap-3 py-3.5">
    <div className="relative shrink-0"><div className={`topone-portrait topone-portrait-${person.portrait}`} /><span className={`absolute bottom-0 left-0 size-[10px] rounded-full border-2 border-background ${person.online ? "bg-topone-positive" : "bg-muted-foreground/40"}`} /></div>
    <div className="min-w-0 flex-1">
      <p className="truncate text-[13px] font-semibold">{person.displayName}</p>
      <p dir="ltr" className="mt-1 truncate text-left font-mono text-[10px] text-muted-foreground">{person.id}<span className="font-sans"> · {country?.name}</span></p>
    </div>
    <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 rounded-full" onClick={() => onFavorite(person)} aria-label={favorite ? "إزالة من المفضلة" : "إضافة للمفضلة"} title={favorite ? "إزالة من المفضلة" : "إضافة للمفضلة"}><Heart className={`size-[17px] ${favorite ? "fill-accent-foreground text-accent-foreground" : "text-muted-foreground"}`} /></Button>
    <Button variant="secondary" size="icon" className="h-9 w-9 shrink-0 rounded-full" onClick={() => onCall(person)} aria-label={`اتصال بـ ${person.displayName}`} title={`اتصال بـ ${person.displayName}`}><Phone className="size-[16px]" /></Button>
  </div>;
}

function HistoryRow({ entry, person, onCall }: { entry: CallEntry; person?: ToponeIdentity | undefined; onCall: () => void }) {
  const isIncoming = entry.direction === "incoming";
  return <div className="flex min-w-0 items-center gap-3 py-3.5">
    <div className="grid size-10 shrink-0 place-items-center rounded-full bg-secondary text-secondary-foreground">{isIncoming ? <ArrowDownLeft className="size-[18px]" /> : <ArrowUpRight className="size-[18px]" />}</div>
    <div className="min-w-0 flex-1"><p className="truncate text-[13px] font-semibold">{person?.displayName ?? entry.id}</p><p dir="ltr" className="mt-1 truncate text-left font-mono text-[10px] text-muted-foreground">{entry.id}</p></div>
    <div className="shrink-0 text-left"><p className="text-[10px] text-muted-foreground">{entry.when}</p><p className="mt-1 text-[10px] text-muted-foreground">{entry.duration}</p></div>
    <Button variant="ghost" size="icon" onClick={onCall} className="h-9 w-9 shrink-0 rounded-full" aria-label={`معاودة الاتصال بـ ${person?.displayName ?? entry.id}`} title="معاودة الاتصال"><PhoneCall className="size-4 text-primary" /></Button>
  </div>;
}

function NavItem({ active, label, icon, onClick }: { active: boolean; label: string; icon: React.ReactNode; onClick: () => void }) {
  return <Button variant={active ? "secondary" : "ghost"} onClick={onClick} className={`topone-nav-button flex flex-1 flex-col gap-1 rounded-[15px] px-1 text-[10px] lg:w-full lg:flex-none ${active ? "text-secondary-foreground" : "text-muted-foreground"}`} aria-label={label} aria-current={active ? "page" : undefined} title={label}>
    <span className="[&_svg]:size-[19px]">{icon}</span><span className="leading-none">{label}</span>
  </Button>;
}

function CallControl({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void }) {
  return <Button variant={active ? "secondary" : "outline"} onClick={onClick} className="flex h-[68px] w-[78px] flex-col gap-2 rounded-[6px] px-2 text-xs">
    <span className="[&_svg]:size-5">{icon}</span>{label}
  </Button>;
}

function PrototypeNotice() {
  return <div className="mt-7 flex items-start gap-3 border-t border-topone-hairline py-4 text-muted-foreground">
    <Clock3 className="mt-0.5 size-4 shrink-0" />
    <p className="text-[11px] leading-5">معاينة تجريبية. بيانات هذا الجهاز غير متزامنة مع حساب حقيقي، والمكالمات لا ترسل صوتًا.</p>
  </div>;
}

function EmptyState({ title, caption }: { title: string; caption: string }) {
  return <div className="flex min-h-48 flex-col items-center justify-center py-9 text-center">
    <div className="mb-3 grid size-12 place-items-center rounded-full bg-topone-soft text-primary"><Search className="size-5" /></div>
    <p className="text-sm font-semibold">{title}</p>
    <p className="mt-2 text-xs text-muted-foreground">{caption}</p>
  </div>;
}

function findAndCall(id: string, people: ToponeIdentity[], onCall: (person: ToponeIdentity) => void) {
  const person = people.find((item) => item.id === id);
  if (person) onCall(person);
}

function formatCallTime(total: number) {
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}