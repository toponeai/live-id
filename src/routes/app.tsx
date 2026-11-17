import { createFileRoute } from "@tanstack/react-router";
import { ToponeCloudApp } from "@/components/topone-cloud-app";
import { LiveAppRouteGuard } from "@/features/app/live-app-route-guard";

export const Route = createFileRoute("/app")({
  head: () => ({ meta: [{ title: "TOPONE — الحساب" }, { name: "description", content: "حساب TOPONE والرسائل وإعدادات الخصوصية." }] }),
  component: () => <LiveAppRouteGuard><ToponeCloudApp /></LiveAppRouteGuard>,
});
