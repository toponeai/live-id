import { Navigate, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TOPONE — Redirecting" },
      { name: "description", content: "Re-directing to the public demo entry point." },
    ],
  }),
  component: () => <Navigate to="/demo" replace />,
});
