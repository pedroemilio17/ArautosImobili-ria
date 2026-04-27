import { useEffect, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function LoginPage() {
  const { session, loading, signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const nav = useNavigate();
  const loc = useLocation() as { state?: { from?: string } };

  useEffect(() => {
    document.title = "Entrar · ECO Leads";
  }, []);

  if (!loading && session) {
    return <Navigate to={loc.state?.from || "/"} replace />;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await signIn(email.trim(), password);
    setSubmitting(false);
    if (error) {
      toast({ title: "Não foi possível entrar", description: error, variant: "destructive" });
    } else {
      nav(loc.state?.from || "/", { replace: true });
    }
  }

  return (
    <div className="min-h-screen grid md:grid-cols-2 bg-background">
      <div className="hidden md:flex flex-col justify-between p-10 bg-primary text-primary-foreground">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-md bg-primary-foreground flex items-center justify-center">
            <span className="text-primary font-black">E</span>
          </div>
          <span className="font-black text-lg tracking-tight">ECO</span>
        </div>
        <div>
          <h1 className="text-5xl font-black tracking-tight leading-[1.05]">
            Just contact.
          </h1>
          <p className="mt-4 text-primary-foreground/70 max-w-sm text-sm">
            Painel operacional de leads. Foco em quem você ainda não falou,
            quem precisa de retorno hoje, e quem ficou para trás.
          </p>
        </div>
        <div className="text-xs text-primary-foreground/50">
          © {new Date().getFullYear()} ECO Leads
        </div>
      </div>

      <div className="flex items-center justify-center p-6 md:p-10">
        <form onSubmit={onSubmit} className="w-full max-w-sm space-y-6">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight">Entrar</h2>
            <p className="text-sm text-muted-foreground">
              Acesso restrito à equipe administrativa.
            </p>
          </div>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Entrar
          </Button>
        </form>
      </div>
    </div>
  );
}