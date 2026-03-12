// ABOUTME: Login page with email/password authentication and TOTP MFA verification.
// ABOUTME: Handles password sign-in, MFA challenge flow, and redirects based on user role.

import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Shield, Lock, KeyRound } from "lucide-react";

// Detect Lovable preview environment to skip auth
const isPreviewMode = () => {
  const hostname = window.location.hostname;
  return hostname.endsWith(".lovableproject.com") || (hostname.endsWith(".lovable.app") && hostname.includes("preview"));
};

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaCode, setMfaCode] = useState("");
  const [mfaFactorId, setMfaFactorId] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  // In preview mode, skip login and go straight to admin
  useEffect(() => {
    if (isPreviewMode()) {
      navigate("/admin", { replace: true });
    }
  }, [navigate]);

  // On mount, check if user already has a session and redirect
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await redirectByRole(session.user.id);
      }
    };
    checkSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const redirectByRole = async (userId: string) => {
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .single();

    if (roleData?.role === "admin") {
      navigate("/admin");
    } else if (roleData?.role === "company") {
      navigate("/company");
    } else {
      navigate("/portal");
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setLoading(false);
      if (error.message.includes("Invalid login credentials")) {
        toast({
          title: "Invalid credentials",
          description: "Please check your email and password.",
          variant: "destructive",
        });
      } else {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      }
      return;
    }

    // Check if MFA is enrolled
    const { data: factors } = await supabase.auth.mfa.listFactors();
    const totpFactors = factors?.totp || [];
    const verifiedFactor = totpFactors.find(f => f.status === "verified");

    if (verifiedFactor) {
      // MFA is enrolled — need to verify
      setMfaFactorId(verifiedFactor.id);
      setMfaRequired(true);
      setLoading(false);
    } else {
      // No MFA — redirect directly
      setLoading(false);
      if (data.session) {
        await redirectByRole(data.session.user.id);
      }
    }
  };

  const handleMfaVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
      factorId: mfaFactorId,
    });

    if (challengeError) {
      setLoading(false);
      toast({ title: "MFA Error", description: challengeError.message, variant: "destructive" });
      return;
    }

    const { data: verifyData, error: verifyError } = await supabase.auth.mfa.verify({
      factorId: mfaFactorId,
      challengeId: challenge.id,
      code: mfaCode,
    });

    setLoading(false);

    if (verifyError) {
      toast({
        title: "Invalid code",
        description: "The verification code is incorrect. Please try again.",
        variant: "destructive",
      });
      return;
    }

    // MFA verified — redirect by role
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      await redirectByRole(session.user.id);
    }
  };

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
          {mfaRequired ? (
            <>
              <CardHeader>
                <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-accent/10">
                  <KeyRound className="h-6 w-6 text-accent" />
                </div>
                <CardTitle className="font-display text-xl text-center text-foreground">Two-Factor Authentication</CardTitle>
                <CardDescription className="text-center text-muted-foreground">
                  Enter the 6-digit code from your authenticator app
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleMfaVerify} className="space-y-4">
                  <div>
                    <Label className="text-foreground/70">Verification Code</Label>
                    <Input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      value={mfaCode}
                      onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ""))}
                      placeholder="000000"
                      required
                      autoFocus
                      className="mt-1 border-border bg-secondary text-foreground text-center text-lg tracking-widest"
                    />
                  </div>
                  <Button type="submit" disabled={loading || mfaCode.length !== 6} className="w-full bg-gradient-royal text-accent-foreground">
                    {loading ? "Verifying..." : "Verify"}
                  </Button>
                </form>
                <button
                  type="button"
                  onClick={() => {
                    setMfaRequired(false);
                    setMfaCode("");
                    setMfaFactorId("");
                    supabase.auth.signOut();
                  }}
                  className="font-body mt-4 w-full text-center text-sm text-muted-foreground hover:text-foreground"
                >
                  Cancel and sign in with a different account
                </button>
              </CardContent>
            </>
          ) : (
            <>
              <CardHeader>
                <CardTitle className="font-display text-xl text-foreground">Sign In</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Enter your credentials to access the portal
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleLogin} className="space-y-4">
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
                  <div>
                    <Label className="text-foreground/70">Password</Label>
                    <Input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="mt-1 border-border bg-secondary text-foreground"
                    />
                  </div>
                  <div className="flex justify-end">
                    <Link to="/forgot-password" className="font-body text-sm text-muted-foreground hover:text-foreground">
                      Forgot password?
                    </Link>
                  </div>
                  <Button type="submit" disabled={loading} className="w-full bg-gradient-royal text-accent-foreground">
                    <Lock className="mr-2 h-4 w-4" />
                    {loading ? "Signing in..." : "Sign In"}
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
