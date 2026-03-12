// ABOUTME: Forgot password page that sends a password reset email via Supabase Auth.
// ABOUTME: Shows a confirmation message after the reset email is sent.

import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Shield, Mail, CheckCircle } from "lucide-react";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    setLoading(false);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setEmailSent(true);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="absolute inset-0 opacity-10">
        <div className="absolute left-1/4 top-1/4 h-96 w-96 rounded-full bg-accent/20 blur-[120px]" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <Link to="/login" className="mb-8 flex items-center gap-2 text-foreground/60 transition-colors hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          <span className="font-body text-sm">Back to sign in</span>
        </Link>

        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-royal">
            <Shield className="h-6 w-6 text-accent-foreground" />
          </div>
          <h1 className="font-display text-3xl font-light text-foreground">Reset Password</h1>
          <p className="font-body mt-2 text-sm text-muted-foreground">Fitzpatrick Capital Partners</p>
        </div>

        <Card className="border-border bg-card backdrop-blur-sm">
          {emailSent ? (
            <>
              <CardHeader className="text-center">
                <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-accent/10">
                  <CheckCircle className="h-6 w-6 text-accent" />
                </div>
                <CardTitle className="font-display text-xl text-foreground">Check your email</CardTitle>
                <CardDescription className="text-muted-foreground">
                  We've sent a password reset link to <span className="font-medium text-foreground">{email}</span>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="font-body text-center text-sm text-muted-foreground">
                  Click the link in your email to reset your password. The link expires in 1 hour.
                </p>
                <Link to="/login" className="font-body block w-full text-center text-sm text-muted-foreground hover:text-foreground">
                  Return to sign in
                </Link>
              </CardContent>
            </>
          ) : (
            <>
              <CardHeader>
                <CardTitle className="font-display text-xl text-foreground">Forgot Password</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Enter your email and we'll send you a link to reset your password
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
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
                    {loading ? "Sending..." : "Send Reset Link"}
                  </Button>
                </form>
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </div>
  );
};

export default ForgotPassword;
