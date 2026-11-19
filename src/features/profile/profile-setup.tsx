import { useState } from "react";
import type { FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  makeToponeId,
  normalizeUsername,
  type CountryCode,
} from "@/lib/topone-identifiers";
import { supabase } from "@/integrations/supabase/client";

export function ProfileSetup({ userId, onComplete }: { userId: string; onComplete: () => void }) {
  const [displayName, setDisplayName] = useState("");
  const [usernameInput, setUsernameInput] = useState("");
  const [countryCode, setCountryCode] = useState<CountryCode>("EG");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const username = normalizeUsername(usernameInput);
  const validUsername = /^[A-Z0-9][A-Z0-9_.-]{1,19}$/.test(username);

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    if (!validUsername) {
      setError("اسم المستخدم يجب أن يتكون من 2 إلى 20 حرفًا أو رقمًا أو نقطة أو شرطة.");
      return;
    }

    setBusy(true);
    try {
      const profileValues = {
        display_name: displayName.trim() || "TOPONE",
        username,
        country_code: countryCode,
        discoverable: false,
      };
      const { data: existing, error: lookupError } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("user_id", userId)
        .maybeSingle();

      if (lookupError) {
        setError("تعذّر حفظ الملف الشخصي. تحقق من اتصال الخدمة وسياسة إنشاء الملف الشخصي.");
        return;
      }

      // The signup trigger normally creates this row already; update it instead of inserting a duplicate.
      const { error: saveError } = existing
        ? await supabase.from("profiles").update(profileValues).eq("user_id", userId)
        : await supabase.from("profiles").insert({ user_id: userId, ...profileValues });

      if (saveError) {
        setError(
          saveError.code === "23505"
            ? "اسم المستخدم مستخدم بالفعل في هذه الدولة. اختر اسمًا آخر."
            : "تعذّر حفظ الملف الشخصي. تحقق من اتصال الخدمة وسياسة إنشاء الملف الشخصي.",
        );
        return;
      }

      onComplete();
    } catch {
      setError("تعذّر الاتصال بالخدمة. حاول مرة أخرى لاحقًا.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="grid min-h-screen place-items-center bg-background p-4" dir="rtl">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="text-2xl">إنشاء ملف TOPONE</CardTitle>
          <CardDescription>
            اختر اسمًا ومعرّفًا ليتمكن الآخرون من العثور عليك. الاكتشاف مغلق افتراضيًا ويمكن تغييره
            لاحقًا من إعدادات الخصوصية.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4" onSubmit={save}>
            <label className="grid gap-2 text-sm font-medium">
              الاسم الظاهر
              <Input
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                maxLength={50}
                autoComplete="name"
              />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              الدولة
              <Select
                value={countryCode}
                onValueChange={(value) => setCountryCode(value as CountryCode)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COUNTRY_OPTIONS.map((country) => (
                    <SelectItem key={country.code} value={country.code}>
                      {country.name} · {country.code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            <label className="grid gap-2 text-sm font-medium">
              اسم المستخدم
              <div
                className="flex h-11 items-center overflow-hidden rounded-md border border-input"
                dir="ltr"
              >
                <span className="shrink-0 px-3 font-mono text-xs text-muted-foreground">
                  ID.{countryCode}.
                </span>
                <Input
                  value={usernameInput}
                  onChange={(event) => setUsernameInput(event.target.value)}
                  maxLength={20}
                  autoComplete="username"
                  aria-label="اسم المستخدم"
                />
              </div>
            </label>
            <p className="text-xs text-muted-foreground">
              معرّفك:{" "}
              <span dir="ltr" className="font-mono">
                {makeToponeId(countryCode, usernameInput)}
              </span>
            </p>
            {error && (
              <p
                role="alert"
                className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive"
              >
                {error}
              </p>
            )}
            <Button type="submit" disabled={busy || !validUsername}>
              {busy ? "جارٍ الحفظ..." : "إنشاء الملف الشخصي"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
