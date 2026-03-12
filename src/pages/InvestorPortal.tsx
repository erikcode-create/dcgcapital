// ABOUTME: Investor portal page showing deals assigned to the logged-in investor.
// ABOUTME: Supports admin "view as investor" mode via ?viewAs= query param.
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { LogOut, TrendingUp, MessageSquare, Heart, User, ArrowLeft, Eye, Download } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import NdaSigning from "@/components/NdaSigning";
import InvestorPreferences from "@/components/InvestorPreferences";

const InvestorPortal = () => {
  const { user, profile, userRole, signOut } = useAuth();
  const isAdminViewing = userRole === "admin";
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const viewAs = searchParams.get("viewAs");
  const [deals, setDeals] = useState<any[]>([]);
  const [messages, setMessages] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [ndaSigned, setNdaSigned] = useState<boolean | null>(null);
  const [viewedProfile, setViewedProfile] = useState<any | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (viewAs && isAdminViewing) {
      // Admin viewing as a specific investor
      setNdaSigned(true);
      fetchViewedInvestor(viewAs);
    } else if (user) {
      if (isAdminViewing) {
        setNdaSigned(true);
        fetchDeals();
      } else {
        checkNda();
      }
    } else {
      // Preview mode with no user and no viewAs — fetch all deals
      setNdaSigned(true);
      fetchDeals();
    }
  }, [user, viewAs]);

  const checkNda = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("nda_signatures")
      .select("id")
      .eq("investor_id", user.id)
      .limit(1);
    const signed = (data && data.length > 0);
    setNdaSigned(signed);
    if (signed) fetchDeals();
    else setLoading(false);
  };

  const fetchViewedInvestor = async (investorId: string) => {
    // Fetch the investor's profile
    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", investorId)
      .single();
    if (profileData) setViewedProfile(profileData);

    // Fetch only their assigned deals
    const { data } = await supabase
      .from("deal_assignments")
      .select("deal_id, deals(*)")
      .eq("investor_id", investorId);
    if (data) {
      setDeals(data.map((d: any) => d.deals).filter(Boolean));
    }
    setLoading(false);
  };

  const fetchDeals = async () => {
    if (isAdminViewing || !user) {
      // Admin or preview mode — show all deals
      const { data } = await supabase
        .from("deals")
        .select("*")
        .order("created_at", { ascending: false });
      if (data) setDeals(data);
    } else {
      const { data } = await supabase
        .from("deal_assignments")
        .select("deal_id, deals(*)")
        .eq("investor_id", user.id);
      if (data) {
        setDeals(data.map((d: any) => d.deals).filter(Boolean));
      }
    }
    setLoading(false);
  };

  const handleExpressInterest = async (dealId: string) => {
    if (!user) return;
    const { error } = await supabase.from("interest_expressions").insert({
      deal_id: dealId,
      investor_id: user.id,
      status: "interested",
    });
    if (error) {
      if (error.code === "23505") {
        toast({ title: "Already expressed interest", description: "You've already expressed interest in this deal." });
      } else {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      }
    } else {
      toast({ title: "Interest recorded", description: "The team has been notified." });
    }
  };

  const handleSendMessage = async (dealId: string) => {
    if (!user || !messages[dealId]?.trim()) return;
    const { error } = await supabase.from("messages").insert({
      deal_id: dealId,
      sender_id: user.id,
      content: messages[dealId].trim(),
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Message sent" });
      setMessages({ ...messages, [dealId]: "" });
    }
  };

  const handleDownloadDeck = async (filePath: string, dealName: string) => {
    try {
      const { data, error } = await supabase.storage.from("pitch-decks").download(filePath);
      if (error || !data) {
        toast({ title: "Error", description: error?.message || "Failed to download", variant: "destructive" });
        return;
      }
      const ext = filePath.split(".").pop() || "pdf";
      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${dealName.replace(/[^a-zA-Z0-9]/g, "_")}_pitch_deck.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-500/10 text-green-600 border-green-500/20";
      case "closed": return "bg-muted text-muted-foreground border-border";
      case "under_review": return "bg-accent/10 text-accent border-accent/20";
      default: return "bg-muted text-muted-foreground border-border";
    }
  };

  // Show NDA signing screen if not signed
  if (ndaSigned === false && !isAdminViewing) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border bg-card">
          <div className="container mx-auto flex h-16 items-center justify-between px-6">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded bg-gradient-royal" />
              <div>
                <h2 className="font-display text-lg font-semibold text-card-foreground">Investor Portal</h2>
                <p className="font-body text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Fitzpatrick Capital Partners</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-body text-sm text-muted-foreground">{profile?.full_name || user?.email}</span>
              </div>
              <Button variant="outline" size="sm" onClick={signOut}>
                <LogOut className="mr-2 h-4 w-4" /> Sign Out
              </Button>
            </div>
          </div>
        </header>
        <NdaSigning onSigned={() => { setNdaSigned(true); fetchDeals(); }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Admin Preview Banner */}
      {isAdminViewing && (
        <div className="bg-gradient-royal px-6 py-2 text-center">
          <div className="container mx-auto flex items-center justify-center gap-3">
            <Eye className="h-4 w-4 text-accent-foreground" />
            <span className="font-body text-sm font-medium text-accent-foreground">Admin Preview — Viewing as {viewedProfile?.full_name || "all investors"}</span>
            <Button size="sm" variant="outline" className="ml-4 h-7 border-accent-foreground/30 text-accent-foreground hover:bg-accent-foreground/10" onClick={() => navigate("/admin")}>
              <ArrowLeft className="mr-1 h-3 w-3" />Back to Admin
            </Button>
          </div>
        </div>
      )}
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded bg-gradient-royal" />
            <div>
              <h2 className="font-display text-lg font-semibold text-card-foreground">Investor Portal</h2>
              <p className="font-body text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Fitzpatrick Capital Partners</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="font-body text-sm text-muted-foreground">{viewedProfile?.full_name || profile?.full_name || user?.email}</span>
            </div>
            <Button variant="outline" size="sm" onClick={signOut}>
              <LogOut className="mr-2 h-4 w-4" /> Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-10">
        <div className="mb-10">
          <h1 className="font-display text-3xl font-light text-foreground">
            Welcome back, <span className="text-primary font-medium">{(viewedProfile?.full_name || profile?.full_name || "Investor").split(" ")[0]}</span>
          </h1>
          <p className="font-body mt-2 text-muted-foreground">Review your assigned deals and opportunities below.</p>
        </div>

        {/* Deal Preferences Section */}
        {(user || viewAs) && (
          <div className="mb-8">
            <InvestorPreferences
              userId={viewAs || user!.id}
              readOnly={!!viewAs && isAdminViewing}
            />
          </div>
        )}

        <div className="mb-10">
          {/* spacer div to preserve layout after preferences card */}
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
          </div>
        ) : deals.length === 0 ? (
          <Card className="border-border">
            <CardContent className="py-16 text-center">
              <TrendingUp className="mx-auto h-12 w-12 text-muted-foreground/30" />
              <h3 className="font-display mt-4 text-xl text-foreground">No deals assigned yet</h3>
              <p className="font-body mt-2 text-sm text-muted-foreground">Your deal flow will appear here once the team assigns opportunities to you.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {deals.map((deal) => (
              <Card key={deal.id} className="border-border transition-all hover:border-accent/30 hover:shadow-lg hover:shadow-accent/5">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="font-display text-xl text-card-foreground">{deal.name}</CardTitle>
                    <Badge className={statusColor(deal.status)}>{deal.status?.replace("_", " ")}</Badge>
                  </div>
                  <CardDescription className="font-body">{deal.sector}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="font-body text-sm text-muted-foreground">{deal.description}</p>
                  {deal.target_return && (
                    <div className="rounded-lg bg-muted p-3">
                      <p className="font-body text-xs text-muted-foreground">Target Return</p>
                      <p className="font-display text-lg font-semibold text-accent">{deal.target_return}</p>
                    </div>
                  )}
                  {deal.pitch_deck_path && (
                    <Button onClick={() => handleDownloadDeck(deal.pitch_deck_path, deal.name)} variant="outline" size="sm" className="w-full">
                      <Download className="mr-2 h-4 w-4" /> Download Pitch Deck
                    </Button>
                  )}
                  <Button onClick={() => handleExpressInterest(deal.id)} variant="outline" size="sm" className="w-full border-accent text-accent hover:bg-accent hover:text-accent-foreground">
                    <Heart className="mr-2 h-4 w-4" /> Express Interest
                  </Button>
                  <div className="space-y-2">
                    <Textarea
                      placeholder="Ask a question about this deal..."
                      value={messages[deal.id] || ""}
                      onChange={(e) => setMessages({ ...messages, [deal.id]: e.target.value })}
                      maxLength={1000} rows={2}
                      className="text-sm"
                    />
                    <Button onClick={() => handleSendMessage(deal.id)} size="sm" variant="ghost" className="w-full text-muted-foreground hover:text-foreground">
                      <MessageSquare className="mr-2 h-4 w-4" /> Send Message
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default InvestorPortal;
