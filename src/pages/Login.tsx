import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Shield } from "lucide-react";

const Login = () => {
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupName, setSignupName] = useState("");
  const [loading, setLoading] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [showForgot, setShowForgot] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: loginPassword,
    });
    setLoading(false);
    if (error) {
      toast({ title: "Login failed", description: error.message, variant: "destructive" });
    } else {
      // Role-based redirect will happen via AuthContext
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", (await supabase.auth.getUser()).data.user?.id ?? "")
        .single();
      
      if (roleData && roleData.role === "admin") {
        navigate("/admin");
      } else {
        navigate("/portal");
      }
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: signupEmail,
      password: signupPassword,
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: signupName },
      },
    });
    setLoading(false);
    if (error) {
      toast({ title: "Signup failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Check your email", description: "We've sent you a verification link." });
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Check your email", description: "We've sent you a password reset link." });
      setShowForgot(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-dark p-6">
      <div className="absolute inset-0 opacity-10">
        <div className="absolute left-1/4 top-1/4 h-96 w-96 rounded-full bg-accent/20 blur-[120px]" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <Link to="/" className="mb-8 flex items-center gap-2 text-primary-foreground/60 transition-colors hover:text-primary-foreground">
          <ArrowLeft className="h-4 w-4" />
          <span className="font-body text-sm">Back to website</span>
        </Link>

        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-gold">
            <Shield className="h-6 w-6 text-accent-foreground" />
          </div>
          <h1 className="font-display text-3xl font-light text-primary-foreground">Investor Portal</h1>
          <p className="font-body mt-2 text-sm text-primary-foreground/50">Fitzpatrick Capital Partners</p>
        </div>

        {showForgot ? (
          <Card className="border-primary-foreground/10 bg-primary-foreground/5 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="font-display text-xl text-primary-foreground">Reset Password</CardTitle>
              <CardDescription className="text-primary-foreground/50">Enter your email to receive a reset link</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div>
                  <Label className="text-primary-foreground/70">Email</Label>
                  <Input type="email" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)}
                    required maxLength={255} className="mt-1 border-primary-foreground/10 bg-primary-foreground/5 text-primary-foreground" />
                </div>
                <Button type="submit" disabled={loading} className="w-full bg-gradient-gold text-accent-foreground">
                  {loading ? "Sending..." : "Send Reset Link"}
                </Button>
                <button type="button" onClick={() => setShowForgot(false)}
                  className="font-body w-full text-center text-sm text-primary-foreground/50 hover:text-primary-foreground">
                  Back to login
                </button>
              </form>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="login">
            <TabsList className="grid w-full grid-cols-2 bg-primary-foreground/5">
              <TabsTrigger value="login" className="font-body text-sm">Sign In</TabsTrigger>
              <TabsTrigger value="signup" className="font-body text-sm">Request Access</TabsTrigger>
            </TabsList>
            <TabsContent value="login">
              <Card className="border-primary-foreground/10 bg-primary-foreground/5 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="font-display text-xl text-primary-foreground">Welcome Back</CardTitle>
                  <CardDescription className="text-primary-foreground/50">Sign in to your investor account</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                      <Label className="text-primary-foreground/70">Email</Label>
                      <Input type="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)}
                        required maxLength={255} className="mt-1 border-primary-foreground/10 bg-primary-foreground/5 text-primary-foreground" />
                    </div>
                    <div>
                      <Label className="text-primary-foreground/70">Password</Label>
                      <Input type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)}
                        required className="mt-1 border-primary-foreground/10 bg-primary-foreground/5 text-primary-foreground" />
                    </div>
                    <Button type="submit" disabled={loading} className="w-full bg-gradient-gold text-accent-foreground">
                      {loading ? "Signing in..." : "Sign In"}
                    </Button>
                    <button type="button" onClick={() => setShowForgot(true)}
                      className="font-body w-full text-center text-sm text-primary-foreground/50 hover:text-primary-foreground">
                      Forgot password?
                    </button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="signup">
              <Card className="border-primary-foreground/10 bg-primary-foreground/5 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="font-display text-xl text-primary-foreground">Request Access</CardTitle>
                  <CardDescription className="text-primary-foreground/50">Create an account to request investor access</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSignup} className="space-y-4">
                    <div>
                      <Label className="text-primary-foreground/70">Full Name</Label>
                      <Input value={signupName} onChange={(e) => setSignupName(e.target.value)}
                        required maxLength={100} className="mt-1 border-primary-foreground/10 bg-primary-foreground/5 text-primary-foreground" />
                    </div>
                    <div>
                      <Label className="text-primary-foreground/70">Email</Label>
                      <Input type="email" value={signupEmail} onChange={(e) => setSignupEmail(e.target.value)}
                        required maxLength={255} className="mt-1 border-primary-foreground/10 bg-primary-foreground/5 text-primary-foreground" />
                    </div>
                    <div>
                      <Label className="text-primary-foreground/70">Password</Label>
                      <Input type="password" value={signupPassword} onChange={(e) => setSignupPassword(e.target.value)}
                        required minLength={8} className="mt-1 border-primary-foreground/10 bg-primary-foreground/5 text-primary-foreground" />
                    </div>
                    <Button type="submit" disabled={loading} className="w-full bg-gradient-gold text-accent-foreground">
                      {loading ? "Creating..." : "Request Access"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
};

export default Login;
