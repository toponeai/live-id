import { createFileRoute } from "@tanstack/react-router";
import { ToponeCloudApp } from "@/components/topone-cloud-app";

export const Route = createFileRoute("/app")({
  head: () => ({
    meta: [
      { title: "TOPONE — الحساب" },
      { name: "description", content: "حساب TOPONE والرسائل وإعدادات الخصوصية." },
    ],
  }),
  component: ToponeCloudApp,
});
