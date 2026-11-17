import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { sendPhoneOtp, verifyPhoneOtp } from "@/features/auth/auth-service";

export function PhoneAuthForm({ onSuccess }: { onSuccess?: () => void }) {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const requestOtp = async () => {
    setError(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      await sendPhoneOtp(phone);
      setStep("otp");
      setSuccessMessage("تم إرسال رمز التحقق إلى رقم الهاتف. يرجى إدخاله أدناه.");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "تعذّر إرسال رمز التحقق. تأكد من ربط Supabase في Lovable Cloud.",
      );
    } finally {
      setLoading(false);
    }
  };

  const confirmOtp = async () => {
    setError(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      await verifyPhoneOtp(phone, otp);
      onSuccess?.();
      setSuccessMessage("تمت المصادقة بنجاح. سيتم إعادة تحميل الحساب الآن.");
    } catch (verifyError) {
      setError(
        verifyError instanceof Error
          ? verifyError.message
          : "فشل تأكيد الرمز. الرجاء المحاولة مجددًا.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="mx-auto w-full max-w-md border-border/80 bg-card shadow-sm">
      <CardHeader>
        <CardTitle className="text-2xl">تسجيل الدخول</CardTitle>
        <CardDescription>
          {step === "phone"
            ? "أدخل رقم هاتفك لتلقي رمز التحقق عبر الرسائل القصيرة."
            : "أدخل الرمز الذي وصل إلى هاتفك لتأكيد الحساب."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {step === "phone" && (
          <>
            <label className="grid gap-2 text-sm font-medium">
              رقم الهاتف
              <Input
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="+966500000000"
                autoComplete="tel"
                dir="ltr"
              />
            </label>

            <Button type="button" className="w-full" onClick={requestOtp} disabled={loading || !phone.trim()}>
              {loading ? "جارٍ الإرسال..." : "إرسال رمز التحقق"}
            </Button>
          </>
        )}

        {step === "otp" && (
          <>
            <label className="grid gap-2 text-sm font-medium">
              رمز التحقق
              <Input
                value={otp}
                onChange={(event) => setOtp(event.target.value)}
                placeholder="123456"
                inputMode="numeric"
                dir="ltr"
              />
            </label>

            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setStep("phone")} disabled={loading}>
                تعديل الرقم
              </Button>
              <Button type="button" className="flex-1" onClick={confirmOtp} disabled={loading || !otp.trim()}>
                {loading ? "جارٍ التحقق..." : "تأكيد الرمز"}
              </Button>
            </div>
          </>
        )}

        {error && (
          <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="rounded-md border border-emerald-500/30 bg-emerald-500/5 p-3 text-sm text-emerald-700">
            {successMessage}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
