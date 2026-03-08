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

const DEAL_TYPES = [
  { key: "buyout", label: "Buyout" },
  { key: "growth_equity", label: "Growth Equity" },
  { key: "recapitalization", label: "Recapitalization" },
  { key: "add_on", label: "Add-On Acquisition" },
  { key: "platform", label: "Platform Investment" },
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
  const [dealNotes, setDealNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("pipeline");
  const [dealDialogOpen, setDealDialogOpen] = useState(false);
  const [detailDeal, setDetailDeal] = useState<any | null>(null);
  const [editingDeal, setEditingDeal] = useState<any | null>(null);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [createInvestorOpen, setCreateInvestorOpen] = useState(false);
  const [selectedDealId, setSelectedDealId] = useState("");
  const [selectedInvestorId, setSelectedInvestorId] = useState("");
  const [replyContent, setReplyContent] = useState<Record<string, string>>({});
  const [newNoteContent, setNewNoteContent] = useState("");
  const [newInvestor, setNewInvestor] = useState({ email: "", password: "", full_name: "", company: "", phone: "" });
  const [creatingInvestor, setCreatingInvestor] = useState(false);
  const [uploadingDeck, setUploadingDeck] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const navigate = useNavigate();
  const [newDeal, setNewDeal] = useState({
    name: "", description: "", sector: "", target_return: "", status: "active",
    stage: "sourcing", enterprise_value: "", ebitda: "", revenue: "",
    investment_amount: "", deal_type: "buyout", geography: "",
    contact_name: "", contact_email: "", notes: "",
  });
  const { toast } = useToast();

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [dealsRes, profilesRes, rolesRes, interestsRes, messagesRes, notesRes] = await Promise.all([
      supabase.from("deals").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("*"),
      supabase.from("user_roles").select("*"),
      supabase.from("interest_expressions").select("*, deals(name)"),
      supabase.from("messages").select("*, deals(name)").order("created_at", { ascending: false }),
      supabase.from("deal_notes").select("*").order("created_at", { ascending: false }),
    ]);
    if (dealsRes.data) setDeals(dealsRes.data);

    const profiles = profilesRes.data || [];
    const roles = rolesRes.data || [];

    // Build a map of user_id -> roles
    const roleMap: Record<string, string[]> = {};
    roles.forEach((r: any) => {
      if (!roleMap[r.user_id]) roleMap[r.user_id] = [];
      roleMap[r.user_id].push(r.role);
    });

    // Filter investors: users with 'investor' role or no role at all
    const investorList = profiles.filter((p: any) => {
      const userRoles = roleMap[p.id] || [];
      return userRoles.includes("investor") || userRoles.length === 0;
    });
    setInvestors(investorList);

    // Enrich interest expressions with profile data
    if (interestsRes.data) {
      const enrichedInterests = interestsRes.data.map((ie: any) => {
        const profile = profiles.find((p: any) => p.id === ie.investor_id);
        return { ...ie, investor_profile: profile || null };
      });
      setInterests(enrichedInterests);
    }

    // Enrich messages with profile data
    if (messagesRes.data) {
      const enrichedMessages = messagesRes.data.map((m: any) => {
        const profile = profiles.find((p: any) => p.id === m.sender_id);
        return { ...m, sender_profile: profile || null };
      });
      setAllMessages(enrichedMessages);
    }

    // Enrich notes with profile data
    if (notesRes.data) {
      const enrichedNotes = notesRes.data.map((n: any) => {
        const profile = profiles.find((p: any) => p.id === n.author_id);
        return { ...n, author_profile: profile || null };
      });
      setDealNotes(enrichedNotes);
    }

    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleCreateDeal = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: any = {
      name: newDeal.name,
      description: newDeal.description,
      sector: newDeal.sector,
      target_return: newDeal.target_return,
      status: newDeal.status,
      stage: newDeal.stage,
      deal_type: newDeal.deal_type,
      geography: newDeal.geography,
      contact_name: newDeal.contact_name,
      contact_email: newDeal.contact_email,
      notes: newDeal.notes,
      created_by: user?.id,
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
        contact_name: "", contact_email: "", notes: "",
      });
      setDealDialogOpen(false);
      fetchAll();
    }
  };

  const handleUpdateDeal = async () => {
    if (!editingDeal) return;
    const { id, created_at, updated_at, created_by, ...updateData } = editingDeal;
    const { error } = await supabase.from("deals").update(updateData).eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Deal updated" });
      setEditingDeal(null);
      setDetailDeal(null);
      fetchAll();
    }
  };

  const handleDeleteDeal = async (id: string) => {
    const { error } = await supabase.from("deals").delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Deal deleted" });
      setDetailDeal(null);
      fetchAll();
    }
  };

  const handleMoveDealStage = async (dealId: string, newStage: string) => {
    const { error } = await supabase.from("deals").update({ stage: newStage }).eq("id", dealId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      fetchAll();
    }
  };

  const handleAssignDeal = async () => {
    if (!selectedDealId || !selectedInvestorId) return;
    const { error } = await supabase.from("deal_assignments").insert({
      deal_id: selectedDealId,
      investor_id: selectedInvestorId,
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
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify(newInvestor),
        }
      );
      const result = await response.json();
      if (!response.ok) {
        toast({ title: "Error", description: result.error, variant: "destructive" });
      } else {
        toast({ title: "Investor created", description: `${newInvestor.full_name} can now log in with their credentials.` });
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
      const { error: uploadError } = await supabase.storage
        .from("pitch-decks")
        .upload(filePath, file);

      if (uploadError) {
        toast({ title: "Upload failed", description: uploadError.message, variant: "destructive" });
        setUploadingDeck(false);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/parse-pitch-deck`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ file_path: filePath }),
        }
      );
      const result = await response.json();
      if (!response.ok) {
        toast({ title: "Error", description: result.error, variant: "destructive" });
      } else {
        toast({
          title: "Deal created from pitch deck!",
          description: `"${result.deal?.name}" has been added to your pipeline.`,
        });
        setUploadDialogOpen(false);
        fetchAll();
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
    setUploadingDeck(false);
  };

  const handleAddNote = async (dealId: string) => {
    if (!newNoteContent.trim() || !user) return;
    const { error } = await supabase.from("deal_notes").insert({
      deal_id: dealId,
      author_id: user.id,
      content: newNoteContent.trim(),
      note_type: "note",
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setNewNoteContent("");
      fetchAll();
    }
  };

  const handleReply = async (messageId: string, dealId: string) => {
    if (!replyContent[messageId]?.trim() || !user) return;
    const { error } = await supabase.from("messages").insert({
      deal_id: dealId,
      sender_id: user.id,
      content: replyContent[messageId].trim(),
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Reply sent" });
      setReplyContent({ ...replyContent, [messageId]: "" });
      fetchAll();
    }
  };

  const getStageColor = (stage: string) => {
    return PIPELINE_STAGES.find(s => s.key === stage)?.color || "bg-muted text-muted-foreground border-border";
  };

  const getStageLabel = (stage: string) => {
    return PIPELINE_STAGES.find(s => s.key === stage)?.label || stage;
  };

  const pipelineDeals = (stage: string) => deals.filter(d => d.stage === stage);

  const totalPipelineValue = deals
    .filter(d => d.stage !== "passed" && d.stage !== "closed")
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
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded bg-gradient-gold" />
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
            { label: "Pipeline Value", value: formatCurrency(totalPipelineValue), icon: DollarSign, accent: true },
            { label: "Active Deals", value: deals.filter(d => !["closed", "passed"].includes(d.stage)).length, icon: Briefcase },
            { label: "Investors", value: investors.length, icon: Users },
            { label: "Interest", value: interests.length, icon: Heart },
            { label: "Messages", value: allMessages.length, icon: MessageSquare },
          ].map((stat, i) => (
            <Card key={i} className={`border-border ${stat.accent ? "bg-gradient-gold" : ""}`}>
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
            </TabsList>
            <div className="flex gap-2">
              <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm"><Users className="mr-2 h-4 w-4" />Assign Deal</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle className="font-display">Assign Deal to Investor</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Deal</Label>
                      <Select value={selectedDealId} onValueChange={setSelectedDealId}>
                        <SelectTrigger className="mt-1"><SelectValue placeholder="Select deal" /></SelectTrigger>
                        <SelectContent>{deals.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Investor</Label>
                      <Select value={selectedInvestorId} onValueChange={setSelectedInvestorId}>
                        <SelectTrigger className="mt-1"><SelectValue placeholder="Select investor" /></SelectTrigger>
                        <SelectContent>{investors.map(i => <SelectItem key={i.id} value={i.id}>{i.full_name || i.email}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <Button onClick={handleAssignDeal} className="w-full bg-gradient-gold text-accent-foreground">Assign</Button>
                  </div>
                </DialogContent>
              </Dialog>
              <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm"><Upload className="mr-2 h-4 w-4" />Upload Deck</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle className="font-display">Upload Pitch Deck</DialogTitle></DialogHeader>
                  <p className="font-body text-sm text-muted-foreground">
                    Upload a pitch deck or investment memo (PDF, PPTX, DOCX) and AI will automatically extract deal details and create a new deal in your pipeline.
                  </p>
                  <div className="mt-4">
                    {uploadingDeck ? (
                      <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-accent/30 bg-accent/5 py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-accent" />
                        <p className="font-body mt-3 text-sm text-muted-foreground">Analyzing pitch deck with AI...</p>
                        <p className="font-body mt-1 text-xs text-muted-foreground">This may take 15-30 seconds</p>
                      </div>
                    ) : (
                      <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border py-12 transition-colors hover:border-accent/50 hover:bg-accent/5">
                        <Upload className="h-8 w-8 text-muted-foreground" />
                        <p className="font-body mt-3 text-sm font-medium text-foreground">Click to upload or drag & drop</p>
                        <p className="font-body mt-1 text-xs text-muted-foreground">PDF, PPTX, or DOCX up to 20MB</p>
                        <input
                          type="file"
                          className="hidden"
                          accept=".pdf,.pptx,.ppt,.docx"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handlePitchDeckUpload(file);
                          }}
                        />
                      </label>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
              <Dialog open={dealDialogOpen} onOpenChange={setDealDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="bg-gradient-gold text-accent-foreground"><Plus className="mr-2 h-4 w-4" />New Deal</Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                  <DialogHeader><DialogTitle className="font-display text-2xl">Create New Deal</DialogTitle></DialogHeader>
                  <form onSubmit={handleCreateDeal} className="space-y-6">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="md:col-span-2"><Label>Company / Deal Name *</Label><Input value={newDeal.name} onChange={(e) => setNewDeal({ ...newDeal, name: e.target.value })} required maxLength={200} className="mt-1" placeholder="Acme Corp" /></div>
                      <div><Label>Sector</Label><Input value={newDeal.sector} onChange={(e) => setNewDeal({ ...newDeal, sector: e.target.value })} maxLength={100} className="mt-1" placeholder="Industrials" /></div>
                      <div><Label>Geography</Label><Input value={newDeal.geography} onChange={(e) => setNewDeal({ ...newDeal, geography: e.target.value })} maxLength={100} className="mt-1" placeholder="Midwest US" /></div>
                      <div>
                        <Label>Deal Type</Label>
                        <Select value={newDeal.deal_type} onValueChange={(v) => setNewDeal({ ...newDeal, deal_type: v })}>
                          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                          <SelectContent>{DEAL_TYPES.map(t => <SelectItem key={t.key} value={t.key}>{t.label}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Pipeline Stage</Label>
                        <Select value={newDeal.stage} onValueChange={(v) => setNewDeal({ ...newDeal, stage: v })}>
                          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                          <SelectContent>{PIPELINE_STAGES.map(s => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                    </div>
                    <Separator />
                    <p className="font-body text-sm font-medium text-muted-foreground uppercase tracking-wider">Financials</p>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div><Label>Enterprise Value ($)</Label><Input type="number" value={newDeal.enterprise_value} onChange={(e) => setNewDeal({ ...newDeal, enterprise_value: e.target.value })} className="mt-1" placeholder="50000000" /></div>
                      <div><Label>EBITDA ($)</Label><Input type="number" value={newDeal.ebitda} onChange={(e) => setNewDeal({ ...newDeal, ebitda: e.target.value })} className="mt-1" placeholder="8000000" /></div>
                      <div><Label>Revenue ($)</Label><Input type="number" value={newDeal.revenue} onChange={(e) => setNewDeal({ ...newDeal, revenue: e.target.value })} className="mt-1" placeholder="40000000" /></div>
                      <div><Label>Investment Amount ($)</Label><Input type="number" value={newDeal.investment_amount} onChange={(e) => setNewDeal({ ...newDeal, investment_amount: e.target.value })} className="mt-1" placeholder="25000000" /></div>
                      <div><Label>Target Return</Label><Input value={newDeal.target_return} onChange={(e) => setNewDeal({ ...newDeal, target_return: e.target.value })} maxLength={50} className="mt-1" placeholder="25% IRR / 3.0x MOIC" /></div>
                    </div>
                    <Separator />
                    <p className="font-body text-sm font-medium text-muted-foreground uppercase tracking-wider">Contact & Details</p>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div><Label>Contact Name</Label><Input value={newDeal.contact_name} onChange={(e) => setNewDeal({ ...newDeal, contact_name: e.target.value })} maxLength={100} className="mt-1" placeholder="John Smith (Banker)" /></div>
                      <div><Label>Contact Email</Label><Input type="email" value={newDeal.contact_email} onChange={(e) => setNewDeal({ ...newDeal, contact_email: e.target.value })} maxLength={255} className="mt-1" /></div>
                    </div>
                    <div><Label>Description</Label><Textarea value={newDeal.description} onChange={(e) => setNewDeal({ ...newDeal, description: e.target.value })} maxLength={2000} className="mt-1" rows={3} placeholder="Brief overview of the opportunity..." /></div>
                    <div><Label>Internal Notes</Label><Textarea value={newDeal.notes} onChange={(e) => setNewDeal({ ...newDeal, notes: e.target.value })} maxLength={2000} className="mt-1" rows={2} placeholder="Initial impressions, sourcing details..." /></div>
                    <Button type="submit" className="w-full bg-gradient-gold text-accent-foreground">Create Deal</Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Pipeline View */}
          <TabsContent value="pipeline">
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
                          onClick={() => setDetailDeal(deal)}
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
            {/* Passed deals */}
            {pipelineDeals("passed").length > 0 && (
              <div className="mt-6">
                <p className="font-body mb-3 text-sm font-medium text-muted-foreground">Passed ({pipelineDeals("passed").length})</p>
                <div className="grid gap-2 md:grid-cols-4">
                  {pipelineDeals("passed").map((deal) => (
                    <Card key={deal.id} className="cursor-pointer border-border opacity-60 hover:opacity-100 transition-opacity" onClick={() => setDetailDeal(deal)}>
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
                     <TableHead className="font-body">Sector</TableHead>
                     <TableHead className="font-body">Stage</TableHead>
                     <TableHead className="font-body">Type</TableHead>
                     <TableHead className="font-body text-right">EV</TableHead>
                     <TableHead className="font-body text-right">EBITDA</TableHead>
                     <TableHead className="font-body text-right">Investment</TableHead>
                     <TableHead className="font-body">Target</TableHead>
                     <TableHead className="font-body">Deck</TableHead>
                     <TableHead className="font-body">Date</TableHead>
                     <TableHead className="font-body"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deals.map((deal) => (
                    <TableRow key={deal.id} className="cursor-pointer" onClick={() => setDetailDeal(deal)}>
                      <TableCell className="font-body font-medium">{deal.name}</TableCell>
                      <TableCell className="font-body text-muted-foreground">{deal.sector || "—"}</TableCell>
                      <TableCell><Badge className={`${getStageColor(deal.stage)} font-body text-[10px]`}>{getStageLabel(deal.stage)}</Badge></TableCell>
                      <TableCell className="font-body text-muted-foreground text-xs">{DEAL_TYPES.find(t => t.key === deal.deal_type)?.label || "—"}</TableCell>
                      <TableCell className="font-body text-right text-sm">{formatCurrency(deal.enterprise_value)}</TableCell>
                      <TableCell className="font-body text-right text-sm">{formatCurrency(deal.ebitda)}</TableCell>
                      <TableCell className="font-body text-right text-sm text-accent">{formatCurrency(deal.investment_amount)}</TableCell>
                      <TableCell className="font-body text-sm">{deal.target_return || "—"}</TableCell>
                      <TableCell className="font-body text-xs text-muted-foreground">{deal.created_at ? format(new Date(deal.created_at), "MMM d") : ""}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleDeleteDeal(deal.id); }} className="text-destructive hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          {/* Investors Tab */}
          <TabsContent value="investors">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="font-display text-2xl text-foreground">Investor Directory</h2>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => navigate("/portal")}>
                  <Eye className="mr-2 h-4 w-4" />View as Investor
                </Button>
                <Dialog open={createInvestorOpen} onOpenChange={setCreateInvestorOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="bg-gradient-gold text-accent-foreground"><Plus className="mr-2 h-4 w-4" />Add Investor</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle className="font-display text-xl">Create Investor Account</DialogTitle></DialogHeader>
                    <form onSubmit={handleCreateInvestor} className="space-y-4">
                      <div><Label>Full Name *</Label><Input value={newInvestor.full_name} onChange={(e) => setNewInvestor({ ...newInvestor, full_name: e.target.value })} required maxLength={100} className="mt-1" /></div>
                      <div><Label>Email *</Label><Input type="email" value={newInvestor.email} onChange={(e) => setNewInvestor({ ...newInvestor, email: e.target.value })} required maxLength={255} className="mt-1" /></div>
                      <div><Label>Temporary Password *</Label><Input type="text" value={newInvestor.password} onChange={(e) => setNewInvestor({ ...newInvestor, password: e.target.value })} required minLength={8} className="mt-1" placeholder="Min 8 characters" /></div>
                      <div><Label>Company</Label><Input value={newInvestor.company} onChange={(e) => setNewInvestor({ ...newInvestor, company: e.target.value })} maxLength={100} className="mt-1" /></div>
                      <div><Label>Phone</Label><Input value={newInvestor.phone} onChange={(e) => setNewInvestor({ ...newInvestor, phone: e.target.value })} maxLength={20} className="mt-1" /></div>
                      <Button type="submit" disabled={creatingInvestor} className="w-full bg-gradient-gold text-accent-foreground">
                        {creatingInvestor ? "Creating..." : "Create Investor Account"}
                      </Button>
                      <p className="font-body text-xs text-muted-foreground text-center">The investor will be able to log in immediately with these credentials.</p>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {investors.map((inv) => (
                <Card key={inv.id} className="border-border">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/10">
                        <User className="h-6 w-6 text-accent" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-body text-sm font-medium text-card-foreground">{inv.full_name || "Unnamed"}</h3>
                        <p className="font-body text-xs text-muted-foreground">{inv.email || "—"}</p>
                        {inv.company && <p className="font-body mt-1 text-xs text-muted-foreground flex items-center gap-1"><Building2 className="h-3 w-3" />{inv.company}</p>}
                        <p className="font-body mt-2 text-[11px] text-muted-foreground">Joined {inv.created_at ? format(new Date(inv.created_at), "MMM d, yyyy") : "—"}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Interest Tab */}
          <TabsContent value="interest">
            <h2 className="font-display mb-6 text-2xl text-foreground">Interest Tracker</h2>
            <Card className="border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-body">Investor</TableHead>
                    <TableHead className="font-body">Deal</TableHead>
                    <TableHead className="font-body">Status</TableHead>
                    <TableHead className="font-body">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {interests.map((int) => (
                    <TableRow key={int.id}>
                      <TableCell className="font-body font-medium">{int.investor_profile?.full_name || int.investor_profile?.email || "—"}</TableCell>
                      <TableCell className="font-body text-muted-foreground">{(int.deals as any)?.name || "—"}</TableCell>
                      <TableCell><Badge variant="outline" className="font-body">{int.status}</Badge></TableCell>
                      <TableCell className="font-body text-sm text-muted-foreground">{int.created_at ? format(new Date(int.created_at), "MMM d, yyyy") : ""}</TableCell>
                    </TableRow>
                  ))}
                  {interests.length === 0 && (
                    <TableRow><TableCell colSpan={4} className="py-12 text-center font-body text-muted-foreground">No interest expressions yet</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          {/* Messages Tab */}
          <TabsContent value="messages">
            <h2 className="font-display mb-6 text-2xl text-foreground">Messages Inbox</h2>
            <div className="space-y-4">
              {allMessages.map((msg) => (
                <Card key={msg.id} className="border-border">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-body text-sm font-medium text-foreground">{msg.sender_profile?.full_name || msg.sender_profile?.email}</p>
                        <p className="font-body text-xs text-muted-foreground">Re: {(msg.deals as any)?.name} · {msg.created_at ? format(new Date(msg.created_at), "MMM d h:mm a") : ""}</p>
                      </div>
                    </div>
                    <p className="font-body mt-3 text-sm text-muted-foreground">{msg.content}</p>
                    <div className="mt-4 flex gap-2">
                      <Input
                        placeholder="Reply..."
                        value={replyContent[msg.id] || ""}
                        onChange={(e) => setReplyContent({ ...replyContent, [msg.id]: e.target.value })}
                        maxLength={1000} className="text-sm"
                      />
                      <Button size="sm" variant="outline" onClick={() => handleReply(msg.id, msg.deal_id)}><Send className="h-4 w-4" /></Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {allMessages.length === 0 && (
                <Card className="border-border"><CardContent className="py-16 text-center"><MessageSquare className="mx-auto h-12 w-12 text-muted-foreground/30" /><p className="font-body mt-4 text-muted-foreground">No messages yet</p></CardContent></Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Deal Detail Slideout */}
      {detailDeal && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-foreground/20 backdrop-blur-sm" onClick={() => { setDetailDeal(null); setEditingDeal(null); }} />
          <div className="relative z-10 h-full w-full max-w-xl overflow-y-auto border-l border-border bg-card shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card p-6">
              <div>
                <h2 className="font-display text-2xl font-medium text-card-foreground">{detailDeal.name}</h2>
                <div className="mt-2 flex items-center gap-2">
                  <Badge className={`${getStageColor(detailDeal.stage)} font-body text-xs`}>{getStageLabel(detailDeal.stage)}</Badge>
                  {detailDeal.deal_type && <Badge variant="outline" className="font-body text-[10px]">{DEAL_TYPES.find(t => t.key === detailDeal.deal_type)?.label}</Badge>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => setEditingDeal(editingDeal ? null : { ...detailDeal })}>
                  <Edit className="mr-1 h-3 w-3" />{editingDeal ? "Cancel" : "Edit"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setDetailDeal(null); setEditingDeal(null); }}>✕</Button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Move stage */}
              <div>
                <p className="font-body text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Move to Stage</p>
                <div className="flex flex-wrap gap-1">
                  {PIPELINE_STAGES.map((stage) => (
                    <Button
                      key={stage.key}
                      size="sm"
                      variant={detailDeal.stage === stage.key ? "default" : "outline"}
                      className="font-body text-xs h-7"
                      onClick={() => {
                        handleMoveDealStage(detailDeal.id, stage.key);
                        setDetailDeal({ ...detailDeal, stage: stage.key });
                      }}
                    >
                      {stage.label}
                    </Button>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Financials */}
              <div>
                <p className="font-body text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Financials</p>
                {editingDeal ? (
                  <div className="grid gap-3 grid-cols-2">
                    <div><Label className="text-xs">Enterprise Value</Label><Input type="number" value={editingDeal.enterprise_value || ""} onChange={(e) => setEditingDeal({ ...editingDeal, enterprise_value: e.target.value ? parseFloat(e.target.value) : null })} className="mt-1" /></div>
                    <div><Label className="text-xs">EBITDA</Label><Input type="number" value={editingDeal.ebitda || ""} onChange={(e) => setEditingDeal({ ...editingDeal, ebitda: e.target.value ? parseFloat(e.target.value) : null })} className="mt-1" /></div>
                    <div><Label className="text-xs">Revenue</Label><Input type="number" value={editingDeal.revenue || ""} onChange={(e) => setEditingDeal({ ...editingDeal, revenue: e.target.value ? parseFloat(e.target.value) : null })} className="mt-1" /></div>
                    <div><Label className="text-xs">Investment</Label><Input type="number" value={editingDeal.investment_amount || ""} onChange={(e) => setEditingDeal({ ...editingDeal, investment_amount: e.target.value ? parseFloat(e.target.value) : null })} className="mt-1" /></div>
                    <div><Label className="text-xs">Target Return</Label><Input value={editingDeal.target_return || ""} onChange={(e) => setEditingDeal({ ...editingDeal, target_return: e.target.value })} className="mt-1" /></div>
                  </div>
                ) : (
                  <div className="grid gap-3 grid-cols-2">
                    {[
                      { label: "Enterprise Value", value: formatCurrency(detailDeal.enterprise_value) },
                      { label: "EBITDA", value: formatCurrency(detailDeal.ebitda) },
                      { label: "Revenue", value: formatCurrency(detailDeal.revenue) },
                      { label: "Investment", value: formatCurrency(detailDeal.investment_amount) },
                      { label: "Target Return", value: detailDeal.target_return || "—" },
                      { label: "EV/EBITDA", value: detailDeal.enterprise_value && detailDeal.ebitda ? `${(detailDeal.enterprise_value / detailDeal.ebitda).toFixed(1)}x` : "—" },
                    ].map((item, i) => (
                      <div key={i} className="rounded-lg bg-muted/50 p-3">
                        <p className="font-body text-[11px] text-muted-foreground">{item.label}</p>
                        <p className="font-body text-sm font-medium text-card-foreground">{item.value}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Separator />

              {/* Details */}
              <div>
                <p className="font-body text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Details</p>
                {editingDeal ? (
                  <div className="space-y-3">
                    <div><Label className="text-xs">Sector</Label><Input value={editingDeal.sector || ""} onChange={(e) => setEditingDeal({ ...editingDeal, sector: e.target.value })} className="mt-1" /></div>
                    <div><Label className="text-xs">Geography</Label><Input value={editingDeal.geography || ""} onChange={(e) => setEditingDeal({ ...editingDeal, geography: e.target.value })} className="mt-1" /></div>
                    <div><Label className="text-xs">Description</Label><Textarea value={editingDeal.description || ""} onChange={(e) => setEditingDeal({ ...editingDeal, description: e.target.value })} className="mt-1" rows={3} /></div>
                    <div><Label className="text-xs">Contact</Label><Input value={editingDeal.contact_name || ""} onChange={(e) => setEditingDeal({ ...editingDeal, contact_name: e.target.value })} className="mt-1" placeholder="Name" /></div>
                    <div><Label className="text-xs">Contact Email</Label><Input value={editingDeal.contact_email || ""} onChange={(e) => setEditingDeal({ ...editingDeal, contact_email: e.target.value })} className="mt-1" /></div>
                    <Button onClick={handleUpdateDeal} className="w-full bg-gradient-gold text-accent-foreground">Save Changes</Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 font-body text-sm"><Building2 className="h-4 w-4 text-muted-foreground" /><span className="text-muted-foreground">{detailDeal.sector || "—"}</span></div>
                    <div className="flex items-center gap-2 font-body text-sm"><MapPin className="h-4 w-4 text-muted-foreground" /><span className="text-muted-foreground">{detailDeal.geography || "—"}</span></div>
                    {detailDeal.contact_name && <div className="flex items-center gap-2 font-body text-sm"><User className="h-4 w-4 text-muted-foreground" /><span className="text-muted-foreground">{detailDeal.contact_name}</span></div>}
                    {detailDeal.contact_email && <div className="flex items-center gap-2 font-body text-sm"><Mail className="h-4 w-4 text-muted-foreground" /><span className="text-muted-foreground">{detailDeal.contact_email}</span></div>}
                    {detailDeal.description && <p className="font-body text-sm text-muted-foreground mt-3">{detailDeal.description}</p>}
                  </div>
                )}
              </div>

              <Separator />

              {/* Activity Notes */}
              <div>
                <p className="font-body text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Activity Log</p>
                <div className="flex gap-2 mb-4">
                  <Textarea
                    placeholder="Add a note..."
                    value={newNoteContent}
                    onChange={(e) => setNewNoteContent(e.target.value)}
                    maxLength={1000} rows={2} className="text-sm"
                  />
                  <Button size="sm" variant="outline" onClick={() => handleAddNote(detailDeal.id)} className="self-end"><Plus className="h-4 w-4" /></Button>
                </div>
                <div className="space-y-3">
                  {dealNotes.filter(n => n.deal_id === detailDeal.id).map((note) => (
                    <div key={note.id} className="rounded-lg bg-muted/50 p-3">
                      <div className="flex items-center justify-between">
                        <p className="font-body text-xs font-medium text-card-foreground">{note.author_profile?.full_name || "Admin"}</p>
                        <p className="font-body text-[11px] text-muted-foreground">{note.created_at ? format(new Date(note.created_at), "MMM d h:mm a") : ""}</p>
                      </div>
                      <p className="font-body mt-1 text-sm text-muted-foreground">{note.content}</p>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Danger Zone */}
              <div className="pb-6">
                <Button variant="outline" size="sm" className="text-destructive border-destructive/20 hover:bg-destructive/10" onClick={() => handleDeleteDeal(detailDeal.id)}>
                  <Trash2 className="mr-2 h-4 w-4" />Delete Deal
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPortal;
