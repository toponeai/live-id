import { createFileRoute } from "@tanstack/react-router";
import { MessagesPage } from "@/features/messaging/messages-page";
import { LiveAppRouteGuard } from "@/features/app/live-app-route-guard";

export const Route = createFileRoute("/app/messages")({
  head: () => ({ meta: [{ title: "TOPONE — الرسائل" }, { name: "description", content: "المحادثات والرسائل داخل TOPONE." }] }),
  component: () => <LiveAppRouteGuard><MessagesPage /></LiveAppRouteGuard>,
});
