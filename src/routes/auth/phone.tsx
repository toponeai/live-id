import { createFileRoute } from "@tanstack/react-router";

import { PhoneAuthForm } from "@/features/auth/phone-auth-form";

export const Route = createFileRoute("/auth/phone")({
  head: () => ({
    meta: [
      { title: "TOPONE — تسجيل الدخول" },
      { name: "description", content: "تسجيل الدخول عبر رقم الهاتف ورمز OTP." },
    ],
  }),
  component: PhoneAuthPage,
});

function PhoneAuthPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-background p-4" dir="rtl">
      <PhoneAuthForm onSuccess={() => window.location.assign("/app")} />
    </main>
  );
}
