import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, Trash2, Users, DollarSign, TrendingUp, Edit, Save, X,
  Briefcase, MapPin, Mail, FileText, Clock, User, Loader2, MessageSquare,
  Building2, Phone, ChevronRight, Upload, Sparkles, Check, X as XIcon
} from "lucide-react";
import DataRoomSection from "@/components/DataRoomSection";
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
  { key: "buyout", label: "Buyout" },
  { key: "growth_equity", label: "Growth Equity" },
  { key: "recapitalization", label: "Recapitalization" },
  { key: "add_on", label: "Add-On Acquisition" },
  { key: "platform", label: "Platform Investment" },
  { key: "revenue_seeking", label: "Revenue Seeking" },
];

const formatCurrency = (value: number | null | undefined) => {
  if (!value) return "—";
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
};

const DealDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [deal, setDeal] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState<any>({});
  const [dealDocuments, setDealDocuments] = useState<any[]>([]);
  const [dealEmails, setDealEmails] = useState<any[]>([]);
  const [dealNotes, setDealNotes] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [investors, setInvestors] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [newNoteContent, setNewNoteContent] = useState("");
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [assignInvestorId, setAssignInvestorId] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedEmail, setSelectedEmail] = useState<any>(null);
  const [aiSuggestions, setAiSuggestions] = useState<any>(null);
  const [analyzingOverview, setAnalyzingOverview] = useState(false);

  const fetchDeal = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const { data, error } = await supabase.from("deals").select("*").eq("id", id).single();
    if (error || !data) {
      toast({ title: "Deal not found", variant: "destructive" });
      navigate("/admin");
      return;
    }
    setDeal(data);
    setEditData(data);
    setLoading(false);
  }, [id, navigate, toast]);

  const fetchRelated = useCallback(async () => {
    if (!id) return;
    const [docsRes, emailsRes, notesRes, assignRes, profilesRes, rolesRes, msgsRes] = await Promise.all([
      (supabase as any).from("deal_documents").select("*").eq("deal_id", id).order("created_at", { ascending: false }),
      (supabase as any).from("deal_emails").select("*, emails(*)").eq("deal_id", id).order("linked_at", { ascending: false }),
      supabase.from("deal_notes").select("*").eq("deal_id", id).order("created_at", { ascending: false }),
      supabase.from("deal_assignments").select("*").eq("deal_id", id),
      supabase.from("profiles").select("*"),
      supabase.from("user_roles").select("*"),
      supabase.from("messages").select("*").eq("deal_id", id).order("created_at", { ascending: false }),
    ]);
    if (docsRes.data) setDealDocuments(docsRes.data);
    if (emailsRes.data) setDealEmails(emailsRes.data);
    
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

    if (notesRes.data) {
      setDealNotes(notesRes.data.map((n: any) => ({
        ...n,
        author_profile: profiles.find((p: any) => p.id === n.author_id) || null,
      })));
    }
    if (assignRes.data) {
      setAssignments(assignRes.data.map((a: any) => ({
        ...a,
        investor_profile: profiles.find((p: any) => p.id === a.investor_id) || null,
      })));
    }
    if (msgsRes.data) {
      setMessages(msgsRes.data.map((m: any) => ({
        ...m,
        sender_profile: profiles.find((p: any) => p.id === m.sender_id) || null,
      })));
    }
  }, [id]);

  useEffect(() => { fetchDeal(); }, [fetchDeal]);
  useEffect(() => { fetchRelated(); }, [fetchRelated]);

  const handleSave = async () => {
    if (!deal) return;
    const { id: _id, created_at, updated_at, created_by, source_email_id, pitch_deck_path, ...updateData } = editData;
    const { error } = await supabase.from("deals").update(updateData).eq("id", deal.id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Deal updated" });
      setEditing(false);
      fetchDeal();
    }
  };

  const handleDelete = async () => {
    if (!deal) return;
    const { error } = await supabase.from("deals").delete().eq("id", deal.id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Deal deleted" });
      navigate("/admin");
    }
  };

  const handleCategoryChange = async (category: string) => {
    if (!deal) return;
    const { error } = await supabase.from("deals").update({ category }).eq("id", deal.id);
    if (!error) {
      setDeal({ ...deal, category });
      setEditData({ ...editData, category });
      toast({ title: "Category updated" });
    }
  };

  const handleStageChange = async (stage: string) => {
    if (!deal) return;
    const { error } = await supabase.from("deals").update({ stage }).eq("id", deal.id);
    if (!error) {
      setDeal({ ...deal, stage });
      setEditData({ ...editData, stage });
    }
  };

  const handleDocUpload = async (dealId: string, file: File, docType: string) => {
    setUploadingDoc(true);
    try {
      const filePath = `${dealId}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from("pitch-decks").upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: insertedDoc, error: insertError } = await (supabase as any).from("deal_documents").insert({
        deal_id: dealId, file_name: file.name, file_path: filePath, file_size: file.size,
        content_type: file.type || "application/octet-stream", document_type: docType,
        uploaded_by: user?.id, source: "manual",
      }).select().single();
      if (insertError) throw insertError;

      toast({ title: "Document uploaded", description: `${file.name} — AI analysis starting...` });
      fetchRelated();

      if (insertedDoc?.id) {
        const { data: { session } } = await supabase.auth.getSession();
        supabase.functions.invoke("analyze-document", {
          headers: { Authorization: `Bearer ${session?.access_token}` },
          body: { document_id: insertedDoc.id },
        }).then(({ error }) => {
          if (!error) {
            toast({ title: "AI Analysis Complete", description: `Summary generated for ${file.name}` });
            fetchRelated();
          }
        });
      }
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleOverviewUpload = async (file: File) => {
    setAnalyzingOverview(true);
    setAiSuggestions(null);
    try {
      const filePath = `${deal.id}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from("pitch-decks").upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: insertedDoc, error: insertError } = await (supabase as any).from("deal_documents").insert({
        deal_id: deal.id, file_name: file.name, file_path: filePath, file_size: file.size,
        content_type: file.type || "application/octet-stream", document_type: "other",
        uploaded_by: user?.id, source: "manual",
      }).select().single();
      if (insertError) throw insertError;

      toast({ title: "Document uploaded", description: `Analyzing ${file.name} with AI...` });
      fetchRelated();

      const { data: { session } } = await supabase.auth.getSession();
      const { data: analysisData, error: analysisError } = await supabase.functions.invoke("analyze-document", {
        headers: { Authorization: `Bearer ${session?.access_token}` },
        body: { document_id: insertedDoc.id, extract_deal_fields: true },
      });

      if (analysisError) {
        toast({ title: "Analysis failed", description: analysisError.message, variant: "destructive" });
      } else if (analysisData?.suggested_fields) {
        // Filter out null suggestions
        const filtered: Record<string, any> = {};
        for (const [key, value] of Object.entries(analysisData.suggested_fields)) {
          if (value !== null && value !== undefined && value !== "") {
            filtered[key] = value;
          }
        }
        if (Object.keys(filtered).length > 0) {
          setAiSuggestions(filtered);
          toast({ title: "AI Suggestions Ready", description: "Review suggested updates below" });
        } else {
          toast({ title: "AI Analysis Complete", description: "No new field suggestions from this document" });
        }
        fetchRelated();
      }
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setAnalyzingOverview(false);
    }
  };

  const applyAiSuggestion = async (field: string, value: any) => {
    const { error } = await supabase.from("deals").update({ [field]: value }).eq("id", deal.id);
    if (!error) {
      setDeal({ ...deal, [field]: value });
      setEditData({ ...editData, [field]: value });
      const remaining = { ...aiSuggestions };
      delete remaining[field];
      setAiSuggestions(Object.keys(remaining).length > 0 ? remaining : null);
      toast({ title: "Field updated", description: `${field} updated from AI suggestion` });
    }
  };

  const applyAllSuggestions = async () => {
    if (!aiSuggestions) return;
    const { error } = await supabase.from("deals").update(aiSuggestions).eq("id", deal.id);
    if (!error) {
      setDeal({ ...deal, ...aiSuggestions });
      setEditData({ ...editData, ...aiSuggestions });
      setAiSuggestions(null);
      toast({ title: "All suggestions applied" });
    }
  };

  const handleAddNote = async () => {
    if (!newNoteContent.trim() || !user || !deal) return;
    const { error } = await supabase.from("deal_notes").insert({
      deal_id: deal.id, author_id: user.id, content: newNoteContent.trim(), note_type: "note",
    });
    if (!error) {
      setNewNoteContent("");
      fetchRelated();
    }
  };

  const handleAssign = async () => {
    if (!assignInvestorId || !deal) return;
    const { error } = await supabase.from("deal_assignments").insert({
      deal_id: deal.id, investor_id: assignInvestorId,
    });
    if (error) {
      if (error.code === "23505") toast({ title: "Already assigned" });
      else toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Investor assigned" });
      setAssignInvestorId("");
      fetchRelated();
    }
  };

  const handleUnassign = async (assignmentId: string) => {
    const { error } = await supabase.from("deal_assignments").delete().eq("id", assignmentId);
    if (!error) fetchRelated();
  };

  if (loading || !deal) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  const categoryInfo = CATEGORIES.find(c => c.key === deal.category) || CATEGORIES[0];
  const stageInfo = PIPELINE_STAGES.find(s => s.key === deal.stage);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/admin")}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Pipeline
            </Button>
            <Separator orientation="vertical" className="h-6" />
            <h2 className="font-display text-lg font-semibold text-card-foreground">{deal.name}</h2>
          </div>
          <div className="flex items-center gap-2">
            {editing ? (
              <>
                <Button size="sm" variant="outline" onClick={() => { setEditing(false); setEditData(deal); }}><X className="mr-1 h-4 w-4" />Cancel</Button>
                <Button size="sm" className="bg-gradient-royal text-accent-foreground" onClick={handleSave}><Save className="mr-1 h-4 w-4" />Save</Button>
              </>
            ) : (
              <>
                <Button size="sm" variant="outline" onClick={() => setEditing(true)}><Edit className="mr-1 h-4 w-4" />Edit</Button>
                <Button size="sm" variant="destructive" onClick={handleDelete}><Trash2 className="mr-1 h-4 w-4" />Delete</Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-6">
        {/* Deal header meta */}
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <Select value={deal.category} onValueChange={handleCategoryChange}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {CATEGORIES.map(c => <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-1">
            {PIPELINE_STAGES.map((stage, idx) => (
              <button
                key={stage.key}
                onClick={() => handleStageChange(stage.key)}
                className={`px-3 py-1 text-xs font-medium rounded-full border transition-all ${
                  deal.stage === stage.key
                    ? stage.color + " ring-2 ring-offset-1 ring-accent/30"
                    : "bg-muted/50 text-muted-foreground border-transparent hover:bg-muted"
                }`}
              >
                {stage.label}
              </button>
            ))}
          </div>

          {deal.sector && (
            <Badge variant="outline" className="font-body text-xs">
              <Building2 className="mr-1 h-3 w-3" />{deal.sector}
            </Badge>
          )}
          {deal.geography && (
            <Badge variant="outline" className="font-body text-xs">
              <MapPin className="mr-1 h-3 w-3" />{deal.geography}
            </Badge>
          )}
        </div>

        {/* Quick stats */}
        <div className="mb-6 grid gap-3 md:grid-cols-4">
          {[
            { label: "Enterprise Value", value: formatCurrency(deal.enterprise_value), icon: DollarSign },
            { label: "EBITDA", value: formatCurrency(deal.ebitda), icon: TrendingUp },
            { label: "Revenue", value: formatCurrency(deal.revenue), icon: Briefcase },
            { label: "Investment", value: formatCurrency(deal.investment_amount), icon: DollarSign },
          ].map((s, i) => (
            <Card key={i} className="border-border">
              <CardContent className="flex items-center gap-3 p-4">
                <s.icon className="h-5 w-5 text-accent" />
                <div>
                  <p className="font-display text-xl font-semibold text-card-foreground">{s.value}</p>
                  <p className="font-body text-[11px] text-muted-foreground">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="overview" className="font-body">Overview</TabsTrigger>
            <TabsTrigger value="dataroom" className="font-body">Data Room ({dealDocuments.length})</TabsTrigger>
            <TabsTrigger value="emails" className="font-body">Emails ({dealEmails.length})</TabsTrigger>
            <TabsTrigger value="activity" className="font-body">Activity ({dealNotes.length})</TabsTrigger>
            <TabsTrigger value="investors" className="font-body">Investors ({assignments.length})</TabsTrigger>
          </TabsList>

          {/* Overview */}
          <TabsContent value="overview">
            <div className="grid gap-6 md:grid-cols-2">
              <Card className="border-border">
                <CardHeader><CardTitle className="font-display text-base">Deal Details</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  {editing ? (
                    <>
                      <div><Label>Company Name</Label><Input value={editData.name} onChange={e => setEditData({...editData, name: e.target.value})} className="mt-1" /></div>
                      <div><Label>Description</Label><Textarea value={editData.description || ""} onChange={e => setEditData({...editData, description: e.target.value})} className="mt-1" rows={3} /></div>
                      <div className="grid gap-3 grid-cols-2">
                        <div><Label>Sector</Label><Input value={editData.sector || ""} onChange={e => setEditData({...editData, sector: e.target.value})} className="mt-1" /></div>
                        <div><Label>Geography</Label><Input value={editData.geography || ""} onChange={e => setEditData({...editData, geography: e.target.value})} className="mt-1" /></div>
                      </div>
                      <div>
                        <Label>Deal Type</Label>
                        <Select value={editData.deal_type || "buyout"} onValueChange={v => setEditData({...editData, deal_type: v})}>
                          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                          <SelectContent>{DEAL_TYPES.map(t => <SelectItem key={t.key} value={t.key}>{t.label}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div><Label>Target Return</Label><Input value={editData.target_return || ""} onChange={e => setEditData({...editData, target_return: e.target.value})} className="mt-1" /></div>
                      <div><Label>Internal Notes</Label><Textarea value={editData.notes || ""} onChange={e => setEditData({...editData, notes: e.target.value})} className="mt-1" rows={3} /></div>
                    </>
                  ) : (
                    <>
                      {deal.description && <p className="font-body text-sm text-muted-foreground">{deal.description}</p>}
                      <div className="grid gap-2 grid-cols-2 text-sm">
                        <div><span className="font-body text-muted-foreground">Type:</span> <span className="font-body font-medium">{DEAL_TYPES.find(t => t.key === deal.deal_type)?.label || "—"}</span></div>
                        <div><span className="font-body text-muted-foreground">Target Return:</span> <span className="font-body font-medium">{deal.target_return || "—"}</span></div>
                        <div><span className="font-body text-muted-foreground">Status:</span> <span className="font-body font-medium capitalize">{deal.status}</span></div>
                        <div><span className="font-body text-muted-foreground">Created:</span> <span className="font-body font-medium">{format(new Date(deal.created_at), "MMM d, yyyy")}</span></div>
                      </div>
                      {deal.notes && (
                        <div className="mt-3 rounded-lg bg-muted/50 p-3">
                          <p className="font-body text-xs font-medium text-muted-foreground mb-1">Internal Notes</p>
                          <p className="font-body text-sm">{deal.notes}</p>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>

              <Card className="border-border">
                <CardHeader><CardTitle className="font-display text-base">Financials</CardTitle></CardHeader>
                <CardContent>
                  {editing ? (
                    <div className="grid gap-3 grid-cols-2">
                      <div><Label>Enterprise Value ($)</Label><Input type="number" value={editData.enterprise_value || ""} onChange={e => setEditData({...editData, enterprise_value: e.target.value ? parseFloat(e.target.value) : null})} className="mt-1" /></div>
                      <div><Label>EBITDA ($)</Label><Input type="number" value={editData.ebitda || ""} onChange={e => setEditData({...editData, ebitda: e.target.value ? parseFloat(e.target.value) : null})} className="mt-1" /></div>
                      <div><Label>Revenue ($)</Label><Input type="number" value={editData.revenue || ""} onChange={e => setEditData({...editData, revenue: e.target.value ? parseFloat(e.target.value) : null})} className="mt-1" /></div>
                      <div><Label>Investment ($)</Label><Input type="number" value={editData.investment_amount || ""} onChange={e => setEditData({...editData, investment_amount: e.target.value ? parseFloat(e.target.value) : null})} className="mt-1" /></div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {[
                        { label: "Enterprise Value", value: deal.enterprise_value },
                        { label: "EBITDA", value: deal.ebitda },
                        { label: "Revenue", value: deal.revenue },
                        { label: "Investment Amount", value: deal.investment_amount },
                      ].map((f, i) => (
                        <div key={i} className="flex items-center justify-between border-b border-border pb-2 last:border-0">
                          <span className="font-body text-sm text-muted-foreground">{f.label}</span>
                          <span className="font-body text-sm font-medium">{formatCurrency(f.value)}</span>
                        </div>
                      ))}
                      {deal.ebitda && deal.enterprise_value && (
                        <div className="flex items-center justify-between pt-1">
                          <span className="font-body text-sm text-muted-foreground">EV / EBITDA</span>
                          <span className="font-body text-sm font-semibold text-accent">{(deal.enterprise_value / deal.ebitda).toFixed(1)}x</span>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-border">
                <CardHeader><CardTitle className="font-display text-base">Contact</CardTitle></CardHeader>
                <CardContent>
                  {editing ? (
                    <div className="space-y-3">
                      <div><Label>Contact Name</Label><Input value={editData.contact_name || ""} onChange={e => setEditData({...editData, contact_name: e.target.value})} className="mt-1" /></div>
                      <div><Label>Contact Email</Label><Input value={editData.contact_email || ""} onChange={e => setEditData({...editData, contact_email: e.target.value})} className="mt-1" /></div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-body text-sm">{deal.contact_name || "—"}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="font-body text-sm">{deal.contact_email || "—"}</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-border">
                <CardHeader><CardTitle className="font-display text-base">Quick Stats</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-body text-sm text-muted-foreground">Documents</span>
                    <span className="font-body text-sm font-medium">{dealDocuments.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-body text-sm text-muted-foreground">Linked Emails</span>
                    <span className="font-body text-sm font-medium">{dealEmails.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-body text-sm text-muted-foreground">Assigned Investors</span>
                    <span className="font-body text-sm font-medium">{assignments.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-body text-sm text-muted-foreground">Messages</span>
                    <span className="font-body text-sm font-medium">{messages.length}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Data Room */}
          <TabsContent value="dataroom">
            <DataRoomSection
              dealId={deal.id}
              dealName={deal.name}
              documents={dealDocuments}
              onUpload={handleDocUpload}
              onRefresh={() => fetchRelated()}
              uploading={uploadingDoc}
            />
          </TabsContent>

          {/* Emails */}
          <TabsContent value="emails">
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="font-display text-base">Email Thread</CardTitle>
                <p className="font-body text-xs text-muted-foreground">
                  Emails auto-linked from data@fitzcap.co by conversation thread
                </p>
              </CardHeader>
              <CardContent>
                {dealEmails.length === 0 ? (
                  <p className="font-body text-sm text-muted-foreground text-center py-8">
                    No emails linked to this deal yet. Emails will auto-link when synced.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {dealEmails.map((de: any) => {
                      const email = de.emails;
                      if (!email) return null;
                      return (
                        <div
                          key={de.id}
                          className="cursor-pointer rounded-lg border border-border p-4 transition-all hover:border-accent/30 hover:bg-muted/30"
                          onClick={() => setSelectedEmail(selectedEmail?.id === email.id ? null : email)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-body text-sm font-medium">{email.from_name || email.from_address}</span>
                                <Badge variant="outline" className="text-[10px]">{de.linked_by}</Badge>
                              </div>
                              <p className="font-body text-sm font-medium mt-1">{email.subject}</p>
                              {selectedEmail?.id !== email.id && (
                                <p className="font-body text-xs text-muted-foreground mt-1 line-clamp-2">{email.body_preview}</p>
                              )}
                            </div>
                            <span className="font-body text-[11px] text-muted-foreground whitespace-nowrap ml-3">
                              {email.received_at ? format(new Date(email.received_at), "MMM d, h:mm a") : ""}
                            </span>
                          </div>
                          {selectedEmail?.id === email.id && (
                            <div className="mt-3 pt-3 border-t border-border">
                              {email.body_html ? (
                                <div className="font-body text-sm prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: email.body_html }} />
                              ) : (
                                <p className="font-body text-sm whitespace-pre-wrap">{email.body_text || email.body_preview}</p>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Activity */}
          <TabsContent value="activity">
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="font-display text-base">Activity & Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-4 flex gap-2">
                  <Textarea
                    placeholder="Add a note..."
                    value={newNoteContent}
                    onChange={e => setNewNoteContent(e.target.value)}
                    className="flex-1"
                    rows={2}
                  />
                  <Button size="sm" onClick={handleAddNote} disabled={!newNoteContent.trim()}>Add</Button>
                </div>
                <div className="space-y-3">
                  {dealNotes.map((note: any) => (
                    <div key={note.id} className="rounded-lg border border-border p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-body text-xs font-medium">
                          {note.author_profile?.full_name || "Admin"}
                        </span>
                        <span className="font-body text-[11px] text-muted-foreground">
                          {format(new Date(note.created_at), "MMM d, h:mm a")}
                        </span>
                      </div>
                      <p className="font-body text-sm">{note.content}</p>
                    </div>
                  ))}
                  {/* Show messages as activity too */}
                  {messages.map((msg: any) => (
                    <div key={msg.id} className="rounded-lg border border-accent/20 bg-accent/5 p-3">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="h-3 w-3 text-accent" />
                          <span className="font-body text-xs font-medium">
                            {msg.sender_profile?.full_name || "User"}
                          </span>
                          <Badge variant="outline" className="text-[10px]">Message</Badge>
                        </div>
                        <span className="font-body text-[11px] text-muted-foreground">
                          {format(new Date(msg.created_at), "MMM d, h:mm a")}
                        </span>
                      </div>
                      <p className="font-body text-sm">{msg.content}</p>
                    </div>
                  ))}
                  {dealNotes.length === 0 && messages.length === 0 && (
                    <p className="font-body text-sm text-muted-foreground text-center py-4">No activity yet</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Investors */}
          <TabsContent value="investors">
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="font-display text-base">Assigned Investors</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-4 flex gap-2">
                  <Select value={assignInvestorId} onValueChange={setAssignInvestorId}>
                    <SelectTrigger className="flex-1"><SelectValue placeholder="Select investor to assign" /></SelectTrigger>
                    <SelectContent>
                      {investors
                        .filter(inv => !assignments.some(a => a.investor_id === inv.id))
                        .map(inv => <SelectItem key={inv.id} value={inv.id}>{inv.full_name || inv.email}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button size="sm" onClick={handleAssign} disabled={!assignInvestorId}>Assign</Button>
                </div>
                <div className="space-y-2">
                  {assignments.map((a: any) => (
                    <div key={a.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/10 text-accent font-body text-sm font-semibold">
                          {(a.investor_profile?.full_name || "?")[0]}
                        </div>
                        <div>
                          <p className="font-body text-sm font-medium">{a.investor_profile?.full_name || "Unknown"}</p>
                          <p className="font-body text-xs text-muted-foreground">{a.investor_profile?.email} · {a.investor_profile?.company || ""}</p>
                        </div>
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => handleUnassign(a.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                  {assignments.length === 0 && (
                    <p className="font-body text-sm text-muted-foreground text-center py-4">No investors assigned</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default DealDetail;
