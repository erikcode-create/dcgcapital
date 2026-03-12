import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  LogOut, Plus, Trash2, Users, BarChart3, MessageSquare, Heart, Send,
  Building2, DollarSign, TrendingUp, Eye, Edit, ChevronRight, ArrowRight,
  Briefcase, MapPin, Phone, Mail, FileText, Clock, User, Upload, Loader2, Download
} from "lucide-react";
import NdaManager from "@/components/NdaManager";
import EmailInbox from "@/components/EmailInbox";
import { format } from "date-fns";

const PIPELINE_STAGES = [
  { key: "sourcing", label: "Sourcing", color: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  { key: "screening", label: "Screening", color: "bg-purple-500/10 text-purple-600 border-purple-500/20" },
  { key: "due_diligence", label: "Due Diligence", color: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  { key: "loi", label: "LOI", color: "bg-orange-500/10 text-orange-600 border-orange-500/20" },
  { key: "closing", label: "Closing", color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
  { key: "closed", label: "Closed", color: "bg-green-500/10 text-green-700 border-green-500/20" },
  { key: "passed", label: "Passed", color: "bg-red-500/10 text-red-600 border-red-500/20" },
];

const CATEGORIES = [
  { key: "equity", label: "Equity", color: "bg-blue-500/10 text-blue-700 border-blue-500/30" },
  { key: "debt", label: "Debt", color: "bg-amber-500/10 text-amber-700 border-amber-500/30" },
  { key: "revenue_seeking", label: "Revenue Seeking", color: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30" },
];

const DEAL_TYPES = [
  { key: "equity", label: "Equity" },
  { key: "debt", label: "Debt" },
  { key: "revenue_seeking", label: "Revenue Seeking" },
];

const formatCurrency = (value: number | null | undefined) => {
  if (!value) return "—";
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
};

const AdminPortal = () => {
  const { user, signOut } = useAuth();
  const [deals, setDeals] = useState<any[]>([]);
  const [investors, setInvestors] = useState<any[]>([]);
  const [interests, setInterests] = useState<any[]>([]);
  const [allMessages, setAllMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("pipeline");
  const [dealDialogOpen, setDealDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [createInvestorOpen, setCreateInvestorOpen] = useState(false);
  const [selectedDealId, setSelectedDealId] = useState("");
  const [selectedInvestorId, setSelectedInvestorId] = useState("");
  const [replyContent, setReplyContent] = useState<Record<string, string>>({});
  const [newInvestor, setNewInvestor] = useState({ email: "", password: "", full_name: "", company: "", phone: "" });
  const [creatingInvestor, setCreatingInvestor] = useState(false);
  const [resendingInvite, setResendingInvite] = useState<string | null>(null);
  const [uploadingDeck, setUploadingDeck] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [pipelineCategory, setPipelineCategory] = useState("equity");
  const navigate = useNavigate();
  const [newDeal, setNewDeal] = useState({
    name: "", description: "", sector: "", target_return: "", status: "active",
    stage: "sourcing", enterprise_value: "", ebitda: "", revenue: "",
    investment_amount: "", deal_type: "buyout", geography: "",
    contact_name: "", contact_email: "", notes: "", category: "equity",
  });
  const { toast } = useToast();

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [dealsRes, profilesRes, rolesRes, interestsRes, messagesRes] = await Promise.all([
      supabase.from("deals").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("*"),
      supabase.from("user_roles").select("*"),
      supabase.from("interest_expressions").select("*, deals(name)"),
      supabase.from("messages").select("*, deals(name)").order("created_at", { ascending: false }),
    ]);
    if (dealsRes.data) setDeals(dealsRes.data);

    const profiles = profilesRes.data || [];
    const roles = rolesRes.data || [];
    const roleMap: Record<string, string[]> = {};
    roles.forEach((r: any) => {
      if (!roleMap[r.user_id]) roleMap[r.user_id] = [];
      roleMap[r.user_id].push(r.role);
    });
    const investorList = profiles.filter((p: any) => {
      const userRoles = roleMap[p.id] || [];
      return userRoles.includes("investor") || userRoles.length === 0;
    });
    setInvestors(investorList);

    if (interestsRes.data) {
      setInterests(interestsRes.data.map((ie: any) => ({
        ...ie,
        investor_profile: profiles.find((p: any) => p.id === ie.investor_id) || null,
      })));
    }
    if (messagesRes.data) {
      setAllMessages(messagesRes.data.map((m: any) => ({
        ...m,
        sender_profile: profiles.find((p: any) => p.id === m.sender_id) || null,
      })));
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleCreateDeal = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: any = {
      name: newDeal.name, description: newDeal.description, sector: newDeal.sector,
      target_return: newDeal.target_return, status: newDeal.status, stage: newDeal.stage,
      deal_type: newDeal.deal_type, geography: newDeal.geography,
      contact_name: newDeal.contact_name, contact_email: newDeal.contact_email,
      notes: newDeal.notes, created_by: user?.id, category: newDeal.category,
    };
    if (newDeal.enterprise_value) payload.enterprise_value = parseFloat(newDeal.enterprise_value);
    if (newDeal.ebitda) payload.ebitda = parseFloat(newDeal.ebitda);
    if (newDeal.revenue) payload.revenue = parseFloat(newDeal.revenue);
    if (newDeal.investment_amount) payload.investment_amount = parseFloat(newDeal.investment_amount);

    const { error } = await supabase.from("deals").insert(payload);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Deal created" });
      setNewDeal({
        name: "", description: "", sector: "", target_return: "", status: "active",
        stage: "sourcing", enterprise_value: "", ebitda: "", revenue: "",
        investment_amount: "", deal_type: "buyout", geography: "",
        contact_name: "", contact_email: "", notes: "", category: "equity",
      });
      setDealDialogOpen(false);
      fetchAll();
    }
  };

  const handleAssignDeal = async () => {
    if (!selectedDealId || !selectedInvestorId) return;
    const { error } = await supabase.from("deal_assignments").insert({
      deal_id: selectedDealId, investor_id: selectedInvestorId,
    });
    if (error) {
      if (error.code === "23505") toast({ title: "Already assigned" });
      else toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Deal assigned to investor" });
      setAssignDialogOpen(false);
    }
  };

  const handleCreateInvestor = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingInvestor(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-investor`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
          body: JSON.stringify(newInvestor),
        }
      );
      const result = await response.json();
      if (!response.ok) {
        toast({ title: "Error", description: result.error, variant: "destructive" });
      } else {
        toast({ title: "Investor created", description: `${newInvestor.full_name} can now log in.` });
        setNewInvestor({ email: "", password: "", full_name: "", company: "", phone: "" });
        setCreateInvestorOpen(false);
        fetchAll();
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
    setCreatingInvestor(false);
  };

  const handlePitchDeckUpload = async (file: File) => {
    setUploadingDeck(true);
    try {
      const filePath = `${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from("pitch-decks").upload(filePath, file);
      if (uploadError) { toast({ title: "Upload failed", description: uploadError.message, variant: "destructive" }); setUploadingDeck(false); return; }

      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/parse-pitch-deck`,
        { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` }, body: JSON.stringify({ file_path: filePath }) }
      );
      const result = await response.json();
      if (!response.ok) {
        toast({ title: "Error", description: result.error, variant: "destructive" });
      } else {
        toast({ title: "Deal created from pitch deck!", description: `"${result.deal?.name}" added to pipeline.` });
        setUploadDialogOpen(false);
        fetchAll();
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
    setUploadingDeck(false);
  };

  const handleReply = async (messageId: string, dealId: string) => {
    if (!replyContent[messageId]?.trim() || !user) return;
    const { error } = await supabase.from("messages").insert({
      deal_id: dealId, sender_id: user.id, content: replyContent[messageId].trim(),
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Reply sent" });
      setReplyContent({ ...replyContent, [messageId]: "" });
      fetchAll();
    }
  };

  const getStageColor = (stage: string) => PIPELINE_STAGES.find(s => s.key === stage)?.color || "bg-muted text-muted-foreground border-border";
  const getStageLabel = (stage: string) => PIPELINE_STAGES.find(s => s.key === stage)?.label || stage;

  const categoryDeals = deals.filter(d => (d as any).category === pipelineCategory);
  const pipelineDeals = (stage: string) => categoryDeals.filter(d => d.stage === stage);

  const totalPipelineValue = deals
    .filter(d => d.stage !== "passed" && d.stage !== "closed")
    .reduce((sum, d) => sum + (d.enterprise_value || 0), 0);

  const getCategoryValue = (cat: string) => deals
    .filter(d => (d as any).category === cat && !["closed", "passed"].includes(d.stage))
    .reduce((sum, d) => sum + (d.enterprise_value || 0), 0);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded bg-gradient-royal" />
            <div>
              <h2 className="font-display text-lg font-semibold text-card-foreground">Deal Flow CRM</h2>
              <p className="font-body text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Fitzpatrick Capital Partners</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="font-body text-sm text-muted-foreground">{user?.email}</span>
              <Badge className="bg-accent/10 text-accent border-accent/20 font-body text-[10px]">ADMIN</Badge>
            </div>
            <Button variant="outline" size="sm" onClick={signOut}>
              <LogOut className="mr-2 h-4 w-4" /> Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        {/* Stats Row */}
        <div className="mb-8 grid gap-4 md:grid-cols-5">
          {[
            { label: "Total Pipeline", value: formatCurrency(totalPipelineValue), icon: DollarSign, accent: true },
            { label: "Equity", value: formatCurrency(getCategoryValue("equity")), icon: Briefcase },
            { label: "Debt", value: formatCurrency(getCategoryValue("debt")), icon: TrendingUp },
            { label: "Revenue Seeking", value: formatCurrency(getCategoryValue("revenue_seeking")), icon: Building2 },
            { label: "Investors", value: investors.length, icon: Users },
          ].map((stat, i) => (
            <Card key={i} className={`border-border ${stat.accent ? "bg-gradient-royal" : ""}`}>
              <CardContent className="flex items-center gap-4 p-5">
                <stat.icon className={`h-7 w-7 ${stat.accent ? "text-accent-foreground" : "text-accent"}`} />
                <div>
                  <p className={`font-display text-2xl font-semibold ${stat.accent ? "text-accent-foreground" : "text-card-foreground"}`}>{stat.value}</p>
                  <p className={`font-body text-xs ${stat.accent ? "text-accent-foreground/70" : "text-muted-foreground"}`}>{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="mb-6 flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="pipeline" className="font-body">Pipeline</TabsTrigger>
              <TabsTrigger value="deals" className="font-body">All Deals</TabsTrigger>
              <TabsTrigger value="investors" className="font-body">Investors</TabsTrigger>
              <TabsTrigger value="interest" className="font-body">Interest</TabsTrigger>
              <TabsTrigger value="messages" className="font-body">Messages</TabsTrigger>
              <TabsTrigger value="nda" className="font-body">NDA</TabsTrigger>
              <TabsTrigger value="email" className="font-body">Email</TabsTrigger>
            </TabsList>
            <div className="flex gap-2">
              <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm"><Users className="mr-2 h-4 w-4" />Assign Deal</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle className="font-display">Assign Deal to Investor</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div><Label>Deal</Label>
                      <Select value={selectedDealId} onValueChange={setSelectedDealId}>
                        <SelectTrigger className="mt-1"><SelectValue placeholder="Select deal" /></SelectTrigger>
                        <SelectContent>{deals.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div><Label>Investor</Label>
                      <Select value={selectedInvestorId} onValueChange={setSelectedInvestorId}>
                        <SelectTrigger className="mt-1"><SelectValue placeholder="Select investor" /></SelectTrigger>
                        <SelectContent>{investors.map(i => <SelectItem key={i.id} value={i.id}>{i.full_name || i.email}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <Button onClick={handleAssignDeal} className="w-full bg-gradient-royal text-accent-foreground">Assign</Button>
                  </div>
                </DialogContent>
              </Dialog>
              <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm"><Upload className="mr-2 h-4 w-4" />Upload Deck</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle className="font-display">Upload Pitch Deck</DialogTitle></DialogHeader>
                  <p className="font-body text-sm text-muted-foreground">Upload a pitch deck (PDF, PPTX, DOCX) and AI will extract deal details.</p>
                  <div className="mt-4">
                    {uploadingDeck ? (
                      <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-accent/30 bg-accent/5 py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-accent" />
                        <p className="font-body mt-3 text-sm text-muted-foreground">Analyzing pitch deck with AI...</p>
                      </div>
                    ) : (
                      <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border py-12 transition-colors hover:border-accent/50 hover:bg-accent/5">
                        <Upload className="h-8 w-8 text-muted-foreground" />
                        <p className="font-body mt-3 text-sm font-medium text-foreground">Click to upload</p>
                        <p className="font-body mt-1 text-xs text-muted-foreground">PDF, PPTX, or DOCX up to 20MB</p>
                        <input type="file" className="hidden" accept=".pdf,.pptx,.ppt,.docx" onChange={(e) => { const file = e.target.files?.[0]; if (file) handlePitchDeckUpload(file); }} />
                      </label>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
              <Dialog open={dealDialogOpen} onOpenChange={setDealDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="bg-gradient-royal text-accent-foreground"><Plus className="mr-2 h-4 w-4" />New Deal</Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                  <DialogHeader><DialogTitle className="font-display text-2xl">Create New Deal</DialogTitle></DialogHeader>
                  <form onSubmit={handleCreateDeal} className="space-y-6">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="md:col-span-2"><Label>Company / Deal Name *</Label><Input value={newDeal.name} onChange={(e) => setNewDeal({ ...newDeal, name: e.target.value })} required maxLength={200} className="mt-1" placeholder="Acme Corp" /></div>
                      <div>
                        <Label>Category *</Label>
                        <Select value={newDeal.category} onValueChange={(v) => setNewDeal({ ...newDeal, category: v })}>
                          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                          <SelectContent>{CATEGORIES.map(c => <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Pipeline Stage</Label>
                        <Select value={newDeal.stage} onValueChange={(v) => setNewDeal({ ...newDeal, stage: v })}>
                          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                          <SelectContent>{PIPELINE_STAGES.map(s => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div><Label>Sector</Label><Input value={newDeal.sector} onChange={(e) => setNewDeal({ ...newDeal, sector: e.target.value })} maxLength={100} className="mt-1" placeholder="Industrials" /></div>
                      <div><Label>Geography</Label><Input value={newDeal.geography} onChange={(e) => setNewDeal({ ...newDeal, geography: e.target.value })} maxLength={100} className="mt-1" placeholder="Midwest US" /></div>
                      <div>
                        <Label>Deal Type</Label>
                        <Select value={newDeal.deal_type} onValueChange={(v) => setNewDeal({ ...newDeal, deal_type: v })}>
                          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                          <SelectContent>{DEAL_TYPES.map(t => <SelectItem key={t.key} value={t.key}>{t.label}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                    </div>
                    <Separator />
                    <p className="font-body text-sm font-medium text-muted-foreground uppercase tracking-wider">Financials</p>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div><Label>Enterprise Value ($)</Label><Input type="number" value={newDeal.enterprise_value} onChange={(e) => setNewDeal({ ...newDeal, enterprise_value: e.target.value })} className="mt-1" /></div>
                      <div><Label>EBITDA ($)</Label><Input type="number" value={newDeal.ebitda} onChange={(e) => setNewDeal({ ...newDeal, ebitda: e.target.value })} className="mt-1" /></div>
                      <div><Label>Revenue ($)</Label><Input type="number" value={newDeal.revenue} onChange={(e) => setNewDeal({ ...newDeal, revenue: e.target.value })} className="mt-1" /></div>
                      <div><Label>Investment Amount ($)</Label><Input type="number" value={newDeal.investment_amount} onChange={(e) => setNewDeal({ ...newDeal, investment_amount: e.target.value })} className="mt-1" /></div>
                      <div><Label>Target Return</Label><Input value={newDeal.target_return} onChange={(e) => setNewDeal({ ...newDeal, target_return: e.target.value })} maxLength={50} className="mt-1" placeholder="25% IRR / 3.0x MOIC" /></div>
                    </div>
                    <Separator />
                    <p className="font-body text-sm font-medium text-muted-foreground uppercase tracking-wider">Contact & Details</p>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div><Label>Contact Name</Label><Input value={newDeal.contact_name} onChange={(e) => setNewDeal({ ...newDeal, contact_name: e.target.value })} maxLength={100} className="mt-1" /></div>
                      <div><Label>Contact Email</Label><Input type="email" value={newDeal.contact_email} onChange={(e) => setNewDeal({ ...newDeal, contact_email: e.target.value })} maxLength={255} className="mt-1" /></div>
                    </div>
                    <div><Label>Description</Label><Textarea value={newDeal.description} onChange={(e) => setNewDeal({ ...newDeal, description: e.target.value })} maxLength={2000} className="mt-1" rows={3} /></div>
                    <div><Label>Internal Notes</Label><Textarea value={newDeal.notes} onChange={(e) => setNewDeal({ ...newDeal, notes: e.target.value })} maxLength={2000} className="mt-1" rows={2} /></div>
                    <Button type="submit" className="w-full bg-gradient-royal text-accent-foreground">Create Deal</Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Pipeline View with Category Tabs */}
          <TabsContent value="pipeline">
            {/* Category tabs */}
            <div className="mb-4 flex items-center gap-2">
              {CATEGORIES.map((cat) => {
                const count = deals.filter(d => (d as any).category === cat.key && !["closed", "passed"].includes(d.stage)).length;
                const value = getCategoryValue(cat.key);
                return (
                  <button
                    key={cat.key}
                    onClick={() => setPipelineCategory(cat.key)}
                    className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                      pipelineCategory === cat.key
                        ? cat.color + " ring-2 ring-offset-1 ring-accent/30"
                        : "bg-muted/30 text-muted-foreground border-transparent hover:bg-muted/60"
                    }`}
                  >
                    {cat.label} ({count}) {value > 0 && <span className="ml-1 text-xs opacity-70">{formatCurrency(value)}</span>}
                  </button>
                );
              })}
            </div>

            <div className="flex gap-4 overflow-x-auto pb-4">
              {PIPELINE_STAGES.filter(s => s.key !== "passed").map((stage) => {
                const stageDeals = pipelineDeals(stage.key);
                const stageValue = stageDeals.reduce((s, d) => s + (d.enterprise_value || 0), 0);
                return (
                  <div key={stage.key} className="min-w-[260px] flex-1">
                    <div className="mb-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge className={`${stage.color} font-body text-xs`}>{stage.label}</Badge>
                        <span className="font-body text-xs text-muted-foreground">{stageDeals.length}</span>
                      </div>
                      {stageValue > 0 && <span className="font-body text-xs text-muted-foreground">{formatCurrency(stageValue)}</span>}
                    </div>
                    <div className="space-y-2">
                      {stageDeals.map((deal) => (
                        <Card
                          key={deal.id}
                          className="cursor-pointer border-border transition-all hover:border-accent/30 hover:shadow-md"
                          onClick={() => navigate(`/admin/deals/${deal.id}`)}
                        >
                          <CardContent className="p-4">
                            <h4 className="font-body text-sm font-medium text-card-foreground">{deal.name}</h4>
                            <p className="font-body mt-1 text-xs text-muted-foreground">{deal.sector}</p>
                            <div className="mt-3 flex items-center justify-between">
                              {deal.enterprise_value && (
                                <span className="font-body text-xs font-medium text-accent">{formatCurrency(deal.enterprise_value)}</span>
                              )}
                              {deal.deal_type && (
                                <Badge variant="outline" className="font-body text-[10px]">
                                  {DEAL_TYPES.find(t => t.key === deal.deal_type)?.label || deal.deal_type}
                                </Badge>
                              )}
                            </div>
                            {deal.geography && <p className="font-body mt-2 text-[11px] text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" />{deal.geography}</p>}
                          </CardContent>
                        </Card>
                      ))}
                      {stageDeals.length === 0 && (
                        <div className="rounded-lg border border-dashed border-border p-6 text-center">
                          <p className="font-body text-xs text-muted-foreground">No deals</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Passed deals for current category */}
            {pipelineDeals("passed").length > 0 && (
              <div className="mt-6">
                <p className="font-body mb-3 text-sm font-medium text-muted-foreground">Passed ({pipelineDeals("passed").length})</p>
                <div className="grid gap-2 md:grid-cols-4">
                  {pipelineDeals("passed").map((deal) => (
                    <Card key={deal.id} className="cursor-pointer border-border opacity-60 hover:opacity-100 transition-opacity" onClick={() => navigate(`/admin/deals/${deal.id}`)}>
                      <CardContent className="p-3">
                        <p className="font-body text-sm text-card-foreground">{deal.name}</p>
                        <p className="font-body text-xs text-muted-foreground">{deal.sector}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          {/* All Deals Table */}
          <TabsContent value="deals">
            <Card className="border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-body">Company</TableHead>
                    <TableHead className="font-body">Category</TableHead>
                    <TableHead className="font-body">Stage</TableHead>
                    <TableHead className="font-body">Sector</TableHead>
                    <TableHead className="font-body">Type</TableHead>
                    <TableHead className="font-body text-right">EV</TableHead>
                    <TableHead className="font-body text-right">Investment</TableHead>
                    <TableHead className="font-body">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deals.map((deal) => (
                    <TableRow key={deal.id} className="cursor-pointer" onClick={() => navigate(`/admin/deals/${deal.id}`)}>
                      <TableCell className="font-body font-medium">{deal.name}</TableCell>
                      <TableCell>
                        <Badge className={`${CATEGORIES.find(c => c.key === (deal as any).category)?.color || ""} font-body text-[10px]`}>
                          {CATEGORIES.find(c => c.key === (deal as any).category)?.label || "Equity"}
                        </Badge>
                      </TableCell>
                      <TableCell><Badge className={`${getStageColor(deal.stage)} font-body text-[10px]`}>{getStageLabel(deal.stage)}</Badge></TableCell>
                      <TableCell className="font-body text-muted-foreground">{deal.sector || "—"}</TableCell>
                      <TableCell className="font-body text-muted-foreground text-xs">{DEAL_TYPES.find(t => t.key === deal.deal_type)?.label || "—"}</TableCell>
                      <TableCell className="font-body text-right font-medium">{formatCurrency(deal.enterprise_value)}</TableCell>
                      <TableCell className="font-body text-right">{formatCurrency(deal.investment_amount)}</TableCell>
                      <TableCell className="font-body text-xs text-muted-foreground">{format(new Date(deal.created_at), "MMM d")}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          {/* Investors */}
          <TabsContent value="investors">
            <div className="flex justify-end mb-4">
              <Dialog open={createInvestorOpen} onOpenChange={setCreateInvestorOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="bg-gradient-royal text-accent-foreground"><Plus className="mr-2 h-4 w-4" />Create Investor</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle className="font-display">Create Investor Account</DialogTitle></DialogHeader>
                  <form onSubmit={handleCreateInvestor} className="space-y-4">
                    <div><Label>Email *</Label><Input type="email" value={newInvestor.email} onChange={(e) => setNewInvestor({ ...newInvestor, email: e.target.value })} required className="mt-1" /></div>
                    <div><Label>Password *</Label><Input type="password" value={newInvestor.password} onChange={(e) => setNewInvestor({ ...newInvestor, password: e.target.value })} required minLength={8} className="mt-1" /></div>
                    <div><Label>Full Name *</Label><Input value={newInvestor.full_name} onChange={(e) => setNewInvestor({ ...newInvestor, full_name: e.target.value })} required className="mt-1" /></div>
                    <div><Label>Company</Label><Input value={newInvestor.company} onChange={(e) => setNewInvestor({ ...newInvestor, company: e.target.value })} className="mt-1" /></div>
                    <div><Label>Phone</Label><Input value={newInvestor.phone} onChange={(e) => setNewInvestor({ ...newInvestor, phone: e.target.value })} className="mt-1" /></div>
                    <Button type="submit" className="w-full bg-gradient-royal text-accent-foreground" disabled={creatingInvestor}>
                      {creatingInvestor ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating...</> : "Create Investor"}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {investors.map((inv) => (
                <Card key={inv.id} className="border-border">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10 text-accent font-body text-sm font-semibold">
                        {(inv.full_name || "?")[0]}
                      </div>
                      <div>
                        <p className="font-body text-sm font-medium">{inv.full_name || "—"}</p>
                        <p className="font-body text-xs text-muted-foreground">{inv.email}</p>
                        {inv.company && <p className="font-body text-xs text-muted-foreground">{inv.company}</p>}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Interest */}
          <TabsContent value="interest">
            <Card className="border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-body">Investor</TableHead>
                    <TableHead className="font-body">Deal</TableHead>
                    <TableHead className="font-body">Status</TableHead>
                    <TableHead className="font-body">Notes</TableHead>
                    <TableHead className="font-body">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {interests.map((ie: any) => (
                    <TableRow key={ie.id}>
                      <TableCell className="font-body">{ie.investor_profile?.full_name || "Unknown"}</TableCell>
                      <TableCell className="font-body font-medium">{ie.deals?.name || "—"}</TableCell>
                      <TableCell><Badge variant="outline" className="font-body text-xs capitalize">{ie.status}</Badge></TableCell>
                      <TableCell className="font-body text-sm text-muted-foreground max-w-[200px] truncate">{ie.notes || "—"}</TableCell>
                      <TableCell className="font-body text-xs text-muted-foreground">{format(new Date(ie.created_at), "MMM d")}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          {/* Messages */}
          <TabsContent value="messages">
            <div className="space-y-4">
              {allMessages.map((msg: any) => (
                <Card key={msg.id} className="border-border">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-body text-sm font-medium">{msg.sender_profile?.full_name || "Unknown"}</span>
                          <Badge variant="outline" className="font-body text-[10px]">{msg.deals?.name || "—"}</Badge>
                        </div>
                        <p className="font-body mt-1 text-sm">{msg.content}</p>
                      </div>
                      <span className="font-body text-[11px] text-muted-foreground">{format(new Date(msg.created_at), "MMM d, h:mm a")}</span>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <Input
                        placeholder="Reply..."
                        value={replyContent[msg.id] || ""}
                        onChange={(e) => setReplyContent({ ...replyContent, [msg.id]: e.target.value })}
                        className="flex-1"
                      />
                      <Button size="sm" onClick={() => handleReply(msg.id, msg.deal_id)}><Send className="h-4 w-4" /></Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {allMessages.length === 0 && <p className="font-body text-sm text-muted-foreground text-center py-8">No messages yet</p>}
            </div>
          </TabsContent>

          <TabsContent value="nda"><NdaManager investors={investors} /></TabsContent>
          <TabsContent value="email"><EmailInbox onDealCreated={fetchAll} /></TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AdminPortal;
