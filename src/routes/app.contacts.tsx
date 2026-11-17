import { createFileRoute } from "@tanstack/react-router";
import { ContactsPage } from "@/features/contact/contacts-page";

export const Route = createFileRoute("/app/contacts")({
  head: () => ({
    meta: [
      { title: "TOPONE — جهات الاتصال" },
      { name: "description", content: "إدارة طلبات التواصل وجهات الاتصال والحظر في TOPONE." },
    ],
  }),
  component: ContactsPage,
});
