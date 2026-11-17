import { Link, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/demo")({
  head: () => ({
    meta: [
      { title: "TOPONE — النسخة التجريبية" },
      { name: "description", content: "استكشف نموذج TOPONE التجريبي ببيانات محلية." },
    ],
  }),
  component: DemoEntry,
});

function DemoEntry() {
  return (
    <main className="topone-shell grid min-h-screen place-items-center px-5 py-12 text-foreground" dir="rtl">
      <section className="w-full max-w-lg rounded-xl border bg-card p-6 text-center shadow-sm sm:p-8">
        <p className="text-sm font-semibold text-primary">TOPONE · DEMO</p>
        <h1 className="mt-3 text-2xl font-bold">النسخة التجريبية</h1>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          النموذج الحالي يستخدم بيانات محفوظة على هذا الجهاز فقط. لا تتم مزامنة هذه البيانات مع حسابك، كما أن المكالمات لا تنقل صوتًا أو فيديو.
        </p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <Link to="/" className="inline-flex min-h-11 items-center justify-center rounded-md border px-5 text-sm font-medium hover:bg-accent">
            فتح النموذج الحالي
          </Link>
          <Link to="/app" className="inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            فتح الحساب والمراسلة
          </Link>
        </div>
      </section>
    </main>
  );
}
