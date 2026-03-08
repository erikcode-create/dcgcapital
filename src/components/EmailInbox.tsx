import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  Mail, RefreshCw, Send, Reply, Inbox, ArrowUpRight,
  Loader2, Search, Paperclip, ChevronLeft, Plus,
  Tag, Briefcase, Download, FileText, Image, File, FileSpreadsheet, Trash2
} from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Email {
  id: string;
  microsoft_id: string;
  subject: string | null;
  from_address: string | null;
  from_name: string | null;
  to_addresses: any;
  cc_addresses: any;
  body_preview: string | null;
  body_html: string | null;
  body_text: string | null;
  received_at: string | null;
  sent_at: string | null;
  is_read: boolean | null;
  has_attachments: boolean | null;
  importance: string | null;
  folder: string | null;
  conversation_id: string | null;
  is_draft: boolean | null;
  created_at: string;
  category: string | null;
}

interface Attachment {
  id: string;
  name: string;
  contentType: string;
  size: number;
}

const EMAIL_CATEGORIES = [
  { key: "equity", label: "Equity", color: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  { key: "debt", label: "Debt", color: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  { key: "revenue_seeking", label: "Revenue Seeking", color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
];

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const getFileIcon = (contentType: string, name: string) => {
  if (contentType.startsWith("image/")) return Image;
  if (contentType.includes("pdf")) return FileText;
  if (contentType.includes("spreadsheet") || contentType.includes("excel") || name.endsWith(".xlsx") || name.endsWith(".csv")) return FileSpreadsheet;
  if (contentType.includes("presentation") || contentType.includes("powerpoint") || name.endsWith(".pptx")) return FileText;
  return File;
};

interface EmailInboxProps {
  onDealCreated?: () => void;
}

const EmailInbox = ({ onDealCreated }: EmailInboxProps) => {
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFolder, setActiveFolder] = useState<"inbox" | "sent">("inbox");
  const [composeOpen, setComposeOpen] = useState(false);
  const [replyOpen, setReplyOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [converting, setConverting] = useState(false);
  const [compose, setCompose] = useState({ to: "", cc: "", subject: "", body: "" });
  const [replyBody, setReplyBody] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loadingAttachments, setLoadingAttachments] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchEmails = useCallback(async () => {
    setLoading(true);
    // Fetch emails and filter out ones already linked to deals
    const [emailsResult, linkedResult] = await Promise.all([
      supabase
        .from("emails")
        .select("*")
        .eq("folder", activeFolder)
        .order("received_at", { ascending: false })
        .limit(100),
      supabase
        .from("deal_emails")
        .select("email_id"),
    ]);

    if (emailsResult.error) {
      console.error("Error fetching emails:", emailsResult.error);
      setEmails([]);
    } else {
      const linkedIds = new Set((linkedResult.data || []).map(d => d.email_id));
      const unlinkedEmails = (emailsResult.data || []).filter(e => !linkedIds.has(e.id));
      setEmails(unlinkedEmails as Email[]);
    }
    setLoading(false);
  }, [activeFolder]);

  // Auto-sync on mount, then load from DB
  const hasAutoSynced = useState(false);
  useEffect(() => {
    if (!hasAutoSynced[0]) {
      hasAutoSynced[1](true);
      syncEmails().then(() => fetchEmails());
    } else {
      fetchEmails();
    }
  }, [fetchEmails]);

  // Fetch attachments when an email with attachments is selected
  useEffect(() => {
    if (!selectedEmail?.has_attachments || !selectedEmail?.microsoft_id) {
      setAttachments([]);
      return;
    }

    const fetchAttachments = async () => {
      setLoadingAttachments(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-email-attachments?microsoft_id=${encodeURIComponent(selectedEmail.microsoft_id)}`;
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const data = await res.json();
        if (data.success && data.attachments) {
          setAttachments(data.attachments);
        }
      } catch (err) {
        console.error("Failed to fetch attachments:", err);
      } finally {
        setLoadingAttachments(false);
      }
    };

    fetchAttachments();
  }, [selectedEmail?.id]);

  const handleDownloadAttachment = async (att: Attachment) => {
    if (!selectedEmail) return;
    setDownloadingId(att.id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-email-attachments?microsoft_id=${encodeURIComponent(selectedEmail.microsoft_id)}&download_id=${encodeURIComponent(att.id)}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (!res.ok) throw new Error("Download failed");

      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = att.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch (err: any) {
      toast({ title: "Download failed", description: err.message, variant: "destructive" });
    } finally {
      setDownloadingId(null);
    }
  };

  const syncEmails = async () => {
    setSyncing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const { data, error } = await supabase.functions.invoke("fetch-emails", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw error;

      toast({
        title: "Emails synced",
        description: `Fetched ${data.fetched || 0} inbox and ${data.sentFetched || 0} sent emails. ${data.inserted || 0} new emails stored.`,
      });
      fetchEmails();
    } catch (err: any) {
      console.error("Sync error:", err);
      toast({ title: "Sync failed", description: err.message || "Failed to sync emails", variant: "destructive" });
    } finally {
      setSyncing(false);
    }
  };

  const sendEmail = async (replyToId?: string) => {
    setSending(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const payload = replyToId
        ? { to: selectedEmail?.from_address, subject: `Re: ${selectedEmail?.subject}`, body: replyBody, replyToId: selectedEmail?.microsoft_id }
        : { to: compose.to.split(",").map((s) => s.trim()).filter(Boolean), cc: compose.cc ? compose.cc.split(",").map((s) => s.trim()).filter(Boolean) : undefined, subject: compose.subject, body: compose.body };

      const { data, error } = await supabase.functions.invoke("send-email", {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: payload,
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      toast({ title: "Email sent", description: "Your email was sent successfully." });
      setComposeOpen(false);
      setReplyOpen(false);
      setCompose({ to: "", cc: "", subject: "", body: "" });
      setReplyBody("");
      fetchEmails();
    } catch (err: any) {
      toast({ title: "Send failed", description: err.message || "Failed to send email", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const handleCategorize = async (emailId: string, category: string) => {
    const { error } = await supabase.from("emails").update({ category } as any).eq("id", emailId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setEmails(prev => prev.map(e => e.id === emailId ? { ...e, category } : e));
      if (selectedEmail?.id === emailId) setSelectedEmail(prev => prev ? { ...prev, category } : null);
      toast({ title: "Email categorized", description: `Marked as ${EMAIL_CATEGORIES.find(c => c.key === category)?.label}` });
    }
  };

  const handleConvertToDeal = async (email: Email, category: string) => {
    setConverting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const { data, error } = await supabase.functions.invoke("convert-email-to-deal", {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: { email_id: email.id, category },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      toast({
        title: "Deal created from email!",
        description: `"${data.deal?.name}" added to pipeline. ${data.attachments_uploaded || 0} attachment(s) saved.`,
      });

      setEmails(prev => prev.map(e => e.id === email.id ? { ...e, category } : e));
      if (selectedEmail?.id === email.id) setSelectedEmail(prev => prev ? { ...prev, category } : null);
      onDealCreated?.();
    } catch (err: any) {
      toast({ title: "Conversion failed", description: err.message || "Failed to convert email to deal", variant: "destructive" });
    } finally {
      setConverting(false);
    }
  };

  const handleDeleteEmail = async (emailId: string) => {
    setDeletingId(emailId);
    try {
      const { error } = await supabase.from("emails").delete().eq("id", emailId);
      if (error) throw error;
      setEmails(prev => prev.filter(e => e.id !== emailId));
      if (selectedEmail?.id === emailId) {
        setSelectedEmail(null);
        setAttachments([]);
      }
      toast({ title: "Email deleted", description: "Email removed successfully." });
    } catch (err: any) {
      toast({ title: "Delete failed", description: err.message, variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  };

  const filteredEmails = emails.filter((e) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (e.subject || "").toLowerCase().includes(q) ||
      (e.from_name || "").toLowerCase().includes(q) ||
      (e.from_address || "").toLowerCase().includes(q) ||
      (e.body_preview || "").toLowerCase().includes(q)
    );
  });

  const formatRecipients = (addresses: any) => {
    if (!addresses || !Array.isArray(addresses)) return "";
    return addresses.map((a: any) => a.name || a.address || "").join(", ");
  };

  const getCategoryBadge = (category: string | null) => {
    if (!category) return null;
    const cat = EMAIL_CATEGORIES.find(c => c.key === category);
    if (!cat) return null;
    return <Badge className={`${cat.color} text-[10px] border`}>{cat.label}</Badge>;
  };

  if (selectedEmail) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => { setSelectedEmail(null); setAttachments([]); }}>
            <ChevronLeft className="mr-1 h-4 w-4" /> Back
          </Button>
          <div className="ml-auto flex gap-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                  <Trash2 className="mr-1 h-4 w-4" /> Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this email?</AlertDialogTitle>
                  <AlertDialogDescription>This will permanently remove this email from the inbox. This action cannot be undone.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => handleDeleteEmail(selectedEmail.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button variant="outline" size="sm" onClick={() => setReplyOpen(true)}>
              <Reply className="mr-1 h-4 w-4" /> Reply
            </Button>
          </div>
        </div>

        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="font-display text-lg">{selectedEmail.subject || "(No Subject)"}</CardTitle>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              {selectedEmail.importance === "high" && (
                <Badge className="bg-destructive/10 text-destructive border-destructive/20 text-[10px]">High Priority</Badge>
              )}
              {selectedEmail.has_attachments && (
                <Badge variant="outline" className="text-[10px]"><Paperclip className="mr-1 h-3 w-3" />Attachments</Badge>
              )}
              <Badge variant="outline" className="text-[10px] capitalize">{selectedEmail.folder}</Badge>
              {getCategoryBadge(selectedEmail.category)}
            </div>
          </CardHeader>
          <Separator />
          <CardContent className="pt-4 space-y-3">
            <div className="grid grid-cols-[80px_1fr] gap-y-2 text-sm font-body">
              <span className="text-muted-foreground">From:</span>
              <span>{selectedEmail.from_name ? `${selectedEmail.from_name} <${selectedEmail.from_address}>` : selectedEmail.from_address}</span>
              <span className="text-muted-foreground">To:</span>
              <span>{formatRecipients(selectedEmail.to_addresses)}</span>
              {selectedEmail.cc_addresses && (selectedEmail.cc_addresses as any[]).length > 0 && (
                <>
                  <span className="text-muted-foreground">CC:</span>
                  <span>{formatRecipients(selectedEmail.cc_addresses)}</span>
                </>
              )}
              <span className="text-muted-foreground">Date:</span>
              <span>{selectedEmail.received_at ? format(new Date(selectedEmail.received_at), "PPpp") : "—"}</span>
            </div>
            <Separator />

            {/* Attachments Section */}
            {selectedEmail.has_attachments && (
              <>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Paperclip className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium font-body">Attachments</span>
                    {loadingAttachments && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
                  </div>
                  {attachments.length > 0 ? (
                    <div className="grid gap-2">
                      {attachments.map((att) => {
                        const IconComponent = getFileIcon(att.contentType, att.name);
                        const isDownloading = downloadingId === att.id;
                        return (
                          <div
                            key={att.id}
                            className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3 hover:bg-muted/60 transition-colors"
                          >
                            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-accent/10">
                              <IconComponent className="h-5 w-5 text-accent" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium font-body truncate">{att.name}</p>
                              <p className="text-xs text-muted-foreground font-body">{formatFileSize(att.size)}</p>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDownloadAttachment(att)}
                              disabled={isDownloading}
                              className="flex-shrink-0"
                            >
                              {isDownloading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Download className="h-4 w-4" />
                              )}
                              <span className="ml-1.5 text-xs">Download</span>
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  ) : !loadingAttachments ? (
                    <p className="text-xs text-muted-foreground font-body">No downloadable attachments found.</p>
                  ) : null}
                </div>
                <Separator />
              </>
            )}

            {/* Categorize & Convert Actions */}
            <div className="flex flex-wrap items-center gap-3 py-2 px-3 rounded-lg bg-muted/30 border border-border">
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-body text-muted-foreground">Categorize:</span>
                <Select
                  value={selectedEmail.category || ""}
                  onValueChange={(val) => handleCategorize(selectedEmail.id, val)}
                >
                  <SelectTrigger className="h-7 w-[160px] text-xs">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {EMAIL_CATEGORIES.map(cat => (
                      <SelectItem key={cat.key} value={cat.key} className="text-xs">{cat.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Separator orientation="vertical" className="h-6" />
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleConvertToDeal(selectedEmail, selectedEmail.category || "equity")}
                disabled={converting}
                className="text-xs"
              >
                {converting ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Briefcase className="mr-1 h-3 w-3" />}
                {converting ? "Creating Deal..." : "Convert to Deal"}
              </Button>
            </div>

            {selectedEmail.body_html ? (
              <div
                className="prose prose-sm max-w-none font-body text-foreground"
                dangerouslySetInnerHTML={{ __html: selectedEmail.body_html }}
              />
            ) : (
              <p className="font-body text-sm text-foreground whitespace-pre-wrap">{selectedEmail.body_text || selectedEmail.body_preview}</p>
            )}
          </CardContent>
        </Card>

        {/* Reply Dialog */}
        <Dialog open={replyOpen} onOpenChange={setReplyOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-display">Reply to: {selectedEmail.subject}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label className="text-xs">To</Label>
                <Input value={selectedEmail.from_address || ""} disabled className="mt-1 bg-muted" />
              </div>
              <div>
                <Label className="text-xs">Message</Label>
                <Textarea
                  value={replyBody}
                  onChange={(e) => setReplyBody(e.target.value)}
                  rows={6}
                  className="mt-1"
                  placeholder="Write your reply..."
                />
              </div>
              <Button
                onClick={() => sendEmail(selectedEmail.microsoft_id)}
                disabled={sending || !replyBody.trim()}
                className="w-full bg-gradient-royal text-accent-foreground"
              >
                {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                Send Reply
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant={activeFolder === "inbox" ? "default" : "outline"}
            size="sm"
            onClick={() => { setActiveFolder("inbox"); setSelectedEmail(null); }}
            className={activeFolder === "inbox" ? "bg-gradient-royal text-accent-foreground" : ""}
          >
            <Inbox className="mr-1 h-4 w-4" /> Inbox
          </Button>
          <Button
            variant={activeFolder === "sent" ? "default" : "outline"}
            size="sm"
            onClick={() => { setActiveFolder("sent"); setSelectedEmail(null); }}
            className={activeFolder === "sent" ? "bg-gradient-royal text-accent-foreground" : ""}
          >
            <ArrowUpRight className="mr-1 h-4 w-4" /> Sent
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search emails..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-64"
            />
          </div>
          <Button variant="outline" size="sm" onClick={syncEmails} disabled={syncing}>
            {syncing ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-1 h-4 w-4" />}
            Sync
          </Button>
          <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-gradient-royal text-accent-foreground">
                <Plus className="mr-1 h-4 w-4" /> Compose
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle className="font-display">New Email</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">To (comma-separated)</Label>
                  <Input value={compose.to} onChange={(e) => setCompose({ ...compose, to: e.target.value })} className="mt-1" placeholder="email@example.com" />
                </div>
                <div>
                  <Label className="text-xs">CC (optional, comma-separated)</Label>
                  <Input value={compose.cc} onChange={(e) => setCompose({ ...compose, cc: e.target.value })} className="mt-1" placeholder="cc@example.com" />
                </div>
                <div>
                  <Label className="text-xs">Subject</Label>
                  <Input value={compose.subject} onChange={(e) => setCompose({ ...compose, subject: e.target.value })} className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs">Message</Label>
                  <Textarea value={compose.body} onChange={(e) => setCompose({ ...compose, body: e.target.value })} rows={8} className="mt-1" placeholder="Write your message..." />
                </div>
                <Button
                  onClick={() => sendEmail()}
                  disabled={sending || !compose.to.trim() || !compose.subject.trim() || !compose.body.trim()}
                  className="w-full bg-gradient-royal text-accent-foreground"
                >
                  {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                  Send Email
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filteredEmails.length === 0 ? (
        <Card className="border-border">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Mail className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="font-body text-muted-foreground">
              {searchQuery ? "No emails match your search." : "No emails yet. Click Sync to fetch emails from data@fitzcap.co."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border overflow-hidden">
          <div className="divide-y divide-border">
            {filteredEmails.map((email) => (
              <div
                key={email.id}
                onClick={() => setSelectedEmail(email)}
                className={`group flex items-start gap-4 px-5 py-4 cursor-pointer transition-colors hover:bg-muted/50 ${
                  !email.is_read && email.folder === "inbox" ? "bg-accent/5" : ""
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {!email.is_read && email.folder === "inbox" && (
                      <div className="h-2 w-2 rounded-full bg-accent flex-shrink-0" />
                    )}
                    <span className={`font-body text-sm truncate ${!email.is_read && email.folder === "inbox" ? "font-semibold text-card-foreground" : "text-muted-foreground"}`}>
                      {email.folder === "sent"
                        ? `To: ${formatRecipients(email.to_addresses)}`
                        : email.from_name || email.from_address}
                    </span>
                    {getCategoryBadge(email.category)}
                    <span className="ml-auto text-[11px] font-body text-muted-foreground flex-shrink-0 flex items-center gap-1">
                      {email.has_attachments && <Paperclip className="h-3 w-3" />}
                      {email.received_at ? format(new Date(email.received_at), "MMM d, h:mm a") : ""}
                    </span>
                  </div>
                  <p className={`font-body text-sm truncate ${!email.is_read && email.folder === "inbox" ? "text-card-foreground font-medium" : "text-card-foreground"}`}>
                    {email.subject || "(No Subject)"}
                  </p>
                  <p className="font-body text-xs text-muted-foreground truncate mt-0.5">
                    {email.body_preview}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-shrink-0 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteEmail(email.id);
                  }}
                  disabled={deletingId === email.id}
                >
                  {deletingId === email.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      <p className="font-body text-xs text-muted-foreground text-center">
        Showing {filteredEmails.length} emails from data@fitzcap.co
      </p>
    </div>
  );
};

export default EmailInbox;
