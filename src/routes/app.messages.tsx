import { createFileRoute } from "@tanstack/react-router";
import { MessagesPage } from "@/features/messaging/messages-page";
import { LiveAppNavigation } from "@/features/app/live-app-navigation";

export const Route = createFileRoute("/app/messages")({
  head: () => ({ meta: [{ title: "TOPONE — الرسائل" }, { name: "description", content: "المحادثات والرسائل داخل TOPONE." }] }),
  component: () => <><LiveAppNavigation /><MessagesPage /></>,
});
