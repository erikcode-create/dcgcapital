import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Shield, Mail, CheckCircle } from "lucide-react";

const Login = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin + "/login",
      },
    });
    setLoading(false);
    if (error) {
      if (error.message.includes("Signups not allowed")) {
        toast({
          title: "Access denied",
          description: "You don't have an account. Please contact an admin to get invited.",
          variant: "destructive",
        });
      } else {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      }
    } else {
      setMagicLinkSent(true);
    }
  };

  // Check if user just arrived via magic link (session will be set by onAuthStateChange)
  // AuthContext handles session — we just need to redirect once authenticated
  const checkSessionAndRedirect = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .single();

      if (roleData?.role === "admin") {
        navigate("/admin");
      } else {
        navigate("/portal");
      }
    }
  };

  // On mount, check if returning from magic link
  useState(() => {
    checkSessionAndRedirect();
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="absolute inset-0 opacity-10">
        <div className="absolute left-1/4 top-1/4 h-96 w-96 rounded-full bg-accent/20 blur-[120px]" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <Link to="/" className="mb-8 flex items-center gap-2 text-foreground/60 transition-colors hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          <span className="font-body text-sm">Back to website</span>
        </Link>

        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-royal">
            <Shield className="h-6 w-6 text-accent-foreground" />
          </div>
          <h1 className="font-display text-3xl font-light text-foreground">Investor Portal</h1>
          <p className="font-body mt-2 text-sm text-muted-foreground">Fitzpatrick Capital Partners</p>
        </div>

        <Card className="border-border bg-card backdrop-blur-sm">
          {magicLinkSent ? (
            <>
              <CardHeader className="text-center">
                <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-accent/10">
                  <CheckCircle className="h-6 w-6 text-accent" />
                </div>
                <CardTitle className="font-display text-xl text-foreground">Check your email</CardTitle>
                <CardDescription className="text-muted-foreground">
                  We've sent a sign-in link to <span className="font-medium text-foreground">{email}</span>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="font-body text-center text-sm text-muted-foreground">
                  Click the link in your email to sign in. The link expires in 1 hour.
                </p>
                <button
                  type="button"
                  onClick={() => setMagicLinkSent(false)}
                  className="font-body w-full text-center text-sm text-muted-foreground hover:text-foreground"
                >
                  Use a different email
                </button>
              </CardContent>
            </>
          ) : (
            <>
              <CardHeader>
                <CardTitle className="font-display text-xl text-foreground">Sign In</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Enter your email to receive a secure sign-in link
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleMagicLink} className="space-y-4">
                  <div>
                    <Label className="text-foreground/70">Email</Label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                      maxLength={255}
                      className="mt-1 border-border bg-secondary text-foreground"
                    />
                  </div>
                  <Button type="submit" disabled={loading} className="w-full bg-gradient-royal text-accent-foreground">
                    <Mail className="mr-2 h-4 w-4" />
                    {loading ? "Sending..." : "Send Magic Link"}
                  </Button>
                </form>
                <p className="font-body mt-6 text-center text-xs text-muted-foreground">
                  Access is invite-only. Contact your admin if you don't have an account.
                </p>
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </div>
  );
};

export default Login;
