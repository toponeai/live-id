import { useContext } from "react";

import { createFileRoute } from "@tanstack/react-router";

import { PhoneAuthForm } from "@/features/auth/phone-auth-form";
import { ToponeAuthContext } from "@/routes/__root";
import { ToponeCloudApp } from "@/components/topone-cloud-app";

export const Route = createFileRoute("/app")({
  head: () => ({
    meta: [
      { title: "TOPONE — الحساب" },
      { name: "description", content: "حساب TOPONE والرسائل وإعدادات الخصوصية." },
    ],
  }),
  component: AccountRoute,
});

function AccountRoute() {
  const auth = useContext(ToponeAuthContext);

  if (!auth?.user) {
    return (
      <main className="grid min-h-screen place-items-center bg-background p-4" dir="rtl">
        <PhoneAuthForm onSuccess={() => window.location.reload()} />
      </main>
    );
  }

  return <ToponeCloudApp />;
}
