import { useContext, useEffect, useState, type ReactNode } from "react";

import { ToponeAuthContext } from "@/routes/__root";
import { supabase } from "@/integrations/supabase/client";
import { PhoneAuthForm } from "@/features/auth/phone-auth-form";
import { ProfileSetup } from "@/features/profile/profile-setup";
import { LiveAppNavigation } from "@/features/app/live-app-navigation";

type ProfileState = "checking" | "setup" | "ready" | "error";

export function LiveAppRouteGuard({ children }: { children: ReactNode }) {
  const auth = useContext(ToponeAuthContext);
  const [profileState, setProfileState] = useState<ProfileState>("checking");
  const [checkVersion, setCheckVersion] = useState(0);

  useEffect(() => {
    if (!auth?.authReady) return;
    if (!auth.user) {
      setProfileState("setup");
      return;
    }

    let active = true;
    setProfileState("checking");
    void supabase.from("profiles").select("user_id").eq("user_id", auth.user.id).maybeSingle()
      .then(
        ({ data, error }) => {
          if (active) setProfileState(error ? "error" : data ? "ready" : "setup");
        },
        () => { if (active) setProfileState("error"); },
      );

    return () => { active = false; };
  }, [auth?.authReady, auth?.user, checkVersion]);

  if (!auth?.authReady || profileState === "checking") {
    return <main className="grid min-h-screen place-items-center bg-background text-sm text-muted-foreground" dir="rtl">جارٍ التحقق من الحساب...</main>;
  }
  if (!auth.user) {
    return <main className="grid min-h-screen place-items-center bg-background p-4" dir="rtl"><PhoneAuthForm onSuccess={() => window.location.reload()} /></main>;
  }
  if (profileState === "error") {
    return (
      <main className="grid min-h-screen place-items-center bg-background p-4" dir="rtl">
        <section className="w-full max-w-md rounded-xl border bg-card p-6 text-center">
          <h1 className="text-lg font-bold">تعذّر تحميل الملف الشخصي</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">تحقق من اتصال Supabase وسياسات الوصول إلى profiles، ثم أعد المحاولة.</p>
          <button className="mt-5 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground" onClick={() => setCheckVersion((version) => version + 1)}>إعادة المحاولة</button>
        </section>
      </main>
    );
  }
  if (profileState === "setup") {
    return <ProfileSetup userId={auth.user.id} onComplete={() => setCheckVersion((version) => version + 1)} />;
  }

  return <><LiveAppNavigation />{children}</>;
}
