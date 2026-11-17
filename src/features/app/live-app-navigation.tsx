import { Link } from "@tanstack/react-router";
import { LogOut, MessageCircle, UsersRound } from "lucide-react";
import { useContext } from "react";

import { Button } from "@/components/ui/button";
import { ToponeAuthContext } from "@/routes/__root";
import { supabase } from "@/integrations/supabase/client";

export function LiveAppNavigation() {
  const auth = useContext(ToponeAuthContext);
  if (!auth?.user) return null;

  return (
    <nav aria-label="تنقل الحساب" className="sticky top-0 z-30 border-b bg-background/95 px-4 py-2 backdrop-blur sm:px-7">
      <div className="mx-auto flex max-w-5xl items-center gap-2">
        <Link to="/app" className="me-auto rounded-md px-3 py-2 text-sm font-bold text-foreground hover:bg-accent">TOPONE</Link>
        <Link to="/app/contacts" className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"><UsersRound className="size-4" /><span className="hidden sm:inline">جهات الاتصال</span></Link>
        <Link to="/app/messages" className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"><MessageCircle className="size-4" /><span className="hidden sm:inline">الرسائل</span></Link>
        <Button variant="ghost" size="sm" onClick={() => void supabase.auth.signOut()} aria-label="تسجيل الخروج"><LogOut className="size-4" /><span className="hidden sm:inline">خروج</span></Button>
      </div>
    </nav>
  );
}
