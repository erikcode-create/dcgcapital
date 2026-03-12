// ABOUTME: MFA enrollment page that generates a TOTP QR code for authenticator apps.
// ABOUTME: Users scan the QR code and verify with a 6-digit code to activate MFA.

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Shield, KeyRound, CheckCircle } from "lucide-react";

const MfaSetup = () => {
  const [qrCode, setQrCode] = useState("");
  const [secret, setSecret] = useState("");
  const [factorId, setFactorId] = useState("");
  const [verifyCode, setVerifyCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [enrolling, setEnrolling] = useState(true);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const enrollMfa = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/login");
        return;
      }

      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "Authenticator App",
      });

      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
        setEnrolling(false);
        return;
      }

      setQrCode(data.totp.qr_code);
      setSecret(data.totp.secret);
      setFactorId(data.id);
      setEnrolling(false);
    };

    enrollMfa();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
      factorId,
    });

    if (challengeError) {
      setLoading(false);
      toast({ title: "Error", description: challengeError.message, variant: "destructive" });
      return;
    }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.id,
      code: verifyCode,
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

    setSuccess(true);
    toast({ title: "MFA enabled", description: "Two-factor authentication has been activated." });
  };

  const handleContinue = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .single();

      if (roleData?.role === "admin") {
        navigate("/admin");
      } else if (roleData?.role === "company") {
        navigate("/company");
      } else {
        navigate("/portal");
      }
    } else {
      navigate("/login");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="absolute inset-0 opacity-10">
        <div className="absolute left-1/4 top-1/4 h-96 w-96 rounded-full bg-accent/20 blur-[120px]" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-royal">
            <Shield className="h-6 w-6 text-accent-foreground" />
          </div>
          <h1 className="font-display text-3xl font-light text-foreground">Set Up MFA</h1>
          <p className="font-body mt-2 text-sm text-muted-foreground">Secure your account with an authenticator app</p>
        </div>

        <Card className="border-border bg-card backdrop-blur-sm">
          {success ? (
            <>
              <CardHeader className="text-center">
                <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-accent/10">
                  <CheckCircle className="h-6 w-6 text-accent" />
                </div>
                <CardTitle className="font-display text-xl text-foreground">MFA Enabled</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Your account is now protected with two-factor authentication.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={handleContinue} className="w-full bg-gradient-royal text-accent-foreground">
                  Continue to Portal
                </Button>
              </CardContent>
            </>
          ) : enrolling ? (
            <CardContent className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
            </CardContent>
          ) : (
            <>
              <CardHeader>
                <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-accent/10">
                  <KeyRound className="h-6 w-6 text-accent" />
                </div>
                <CardTitle className="font-display text-xl text-center text-foreground">Scan QR Code</CardTitle>
                <CardDescription className="text-center text-muted-foreground">
                  Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {qrCode && (
                  <div className="flex justify-center">
                    <img src={qrCode} alt="MFA QR Code" className="h-48 w-48 rounded-lg" />
                  </div>
                )}

                {secret && (
                  <div className="rounded-md bg-secondary p-3">
                    <p className="font-body text-xs text-muted-foreground text-center mb-1">
                      Or enter this key manually:
                    </p>
                    <p className="font-mono text-sm text-foreground text-center break-all select-all">
                      {secret}
                    </p>
                  </div>
                )}

                <form onSubmit={handleVerify} className="space-y-4">
                  <div>
                    <Label className="text-foreground/70">Verification Code</Label>
                    <Input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      value={verifyCode}
                      onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ""))}
                      placeholder="000000"
                      required
                      className="mt-1 border-border bg-secondary text-foreground text-center text-lg tracking-widest"
                    />
                  </div>
                  <Button type="submit" disabled={loading || verifyCode.length !== 6} className="w-full bg-gradient-royal text-accent-foreground">
                    {loading ? "Verifying..." : "Activate MFA"}
                  </Button>
                </form>

                <button
                  type="button"
                  onClick={handleContinue}
                  className="font-body w-full text-center text-sm text-muted-foreground hover:text-foreground"
                >
                  Skip for now
                </button>
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </div>
  );
};

export default MfaSetup;
