import { useContext, useEffect, useState } from "react";

import { createFileRoute } from "@tanstack/react-router";

import { PhoneAuthForm } from "@/features/auth/phone-auth-form";
import { ProfileSetup } from "@/features/profile/profile-setup";
import { ToponeAuthContext } from "@/routes/__root";
import { ToponeCloudApp } from "@/components/topone-cloud-app";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/app")({
  head: () => ({
    meta: [
      { title: "TOPONE — الحساب" },
      { name: "description", content: "حساب TOPONE والرسائل وإعدادات الخصوصية." },
    ],
  }),
  component: AccountRoute,
});

type ProfileCheck = "loading" | "missing" | "ready" | "error";

function AccountRoute() {
  const auth = useContext(ToponeAuthContext);
  const [profileCheck, setProfileCheck] = useState<ProfileCheck>("loading");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (!auth?.authReady) return;
    if (!auth.user) {
      setProfileCheck("missing");
      return;
    }

    let active = true;
    setProfileCheck("loading");
    void supabase.from("profiles").select("user_id").eq("user_id", auth.user.id).maybeSingle()
      .then(({ data, error }) => {
        if (!active) return;
        setProfileCheck(error ? "error" : data ? "ready" : "missing");
      })
      .catch(() => {
        if (active) setProfileCheck("error");
      });

    return () => { active = false; };
  }, [auth?.authReady, auth?.user, retry]);

  if (!auth?.authReady || profileCheck === "loading") {
    return <main className="grid min-h-screen place-items-center bg-background text-sm text-muted-foreground" dir="rtl">جارٍ التحقق من الحساب...</main>;
  }

  if (!auth.user) {
    return <main className="grid min-h-screen place-items-center bg-background p-4" dir="rtl"><PhoneAuthForm onSuccess={() => window.location.reload()} /></main>;
  }

  if (profileCheck === "error") {
    return (
      <main className="grid min-h-screen place-items-center bg-background p-4" dir="rtl">
        <section className="w-full max-w-md rounded-xl border bg-card p-6 text-center">
          <h1 className="text-lg font-bold">تعذّر تحميل الملف الشخصي</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">تحقق من اتصال Supabase وسياسات الوصول إلى profiles، ثم أعد المحاولة.</p>
          <button className="mt-5 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground" onClick={() => setRetry((value) => value + 1)}>إعادة المحاولة</button>
        </section>
      </main>
    );
  }

  if (profileCheck === "missing") {
    return <ProfileSetup userId={auth.user.id} onComplete={() => setRetry((value) => value + 1)} />;
  }

  return <ToponeCloudApp />;
}
