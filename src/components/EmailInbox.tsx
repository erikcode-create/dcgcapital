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
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  Mail, RefreshCw, Send, Reply, Inbox, ArrowUpRight,
  Loader2, Search, Clock, Paperclip, Star, ChevronLeft, Plus,
  Eye
} from "lucide-react";

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
}

const EmailInbox = () => {
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFolder, setActiveFolder] = useState<"inbox" | "sent">("inbox");
  const [composeOpen, setComposeOpen] = useState(false);
  const [replyOpen, setReplyOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [compose, setCompose] = useState({ to: "", cc: "", subject: "", body: "" });
  const [replyBody, setReplyBody] = useState("");
  const { toast } = useToast();

  const fetchEmails = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("emails")
      .select("*")
      .eq("folder", activeFolder)
      .order("received_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error("Error fetching emails:", error);
    } else {
      setEmails((data as Email[]) || []);
    }
    setLoading(false);
  }, [activeFolder]);

  useEffect(() => {
    fetchEmails();
  }, [fetchEmails]);

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
      toast({
        title: "Sync failed",
        description: err.message || "Failed to sync emails",
        variant: "destructive",
      });
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
        ? {
            to: selectedEmail?.from_address,
            subject: `Re: ${selectedEmail?.subject}`,
            body: replyBody,
            replyToId: selectedEmail?.microsoft_id,
          }
        : {
            to: compose.to.split(",").map((s) => s.trim()).filter(Boolean),
            cc: compose.cc ? compose.cc.split(",").map((s) => s.trim()).filter(Boolean) : undefined,
            subject: compose.subject,
            body: compose.body,
          };

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
      console.error("Send error:", err);
      toast({
        title: "Send failed",
        description: err.message || "Failed to send email",
        variant: "destructive",
      });
    } finally {
      setSending(false);
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

  if (selectedEmail) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setSelectedEmail(null)}>
            <ChevronLeft className="mr-1 h-4 w-4" /> Back
          </Button>
          <div className="ml-auto flex gap-2">
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
                  <Input
                    value={compose.to}
                    onChange={(e) => setCompose({ ...compose, to: e.target.value })}
                    className="mt-1"
                    placeholder="email@example.com"
                  />
                </div>
                <div>
                  <Label className="text-xs">CC (optional, comma-separated)</Label>
                  <Input
                    value={compose.cc}
                    onChange={(e) => setCompose({ ...compose, cc: e.target.value })}
                    className="mt-1"
                    placeholder="cc@example.com"
                  />
                </div>
                <div>
                  <Label className="text-xs">Subject</Label>
                  <Input
                    value={compose.subject}
                    onChange={(e) => setCompose({ ...compose, subject: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Message</Label>
                  <Textarea
                    value={compose.body}
                    onChange={(e) => setCompose({ ...compose, body: e.target.value })}
                    rows={8}
                    className="mt-1"
                    placeholder="Write your message..."
                  />
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
                className={`flex items-start gap-4 px-5 py-4 cursor-pointer transition-colors hover:bg-muted/50 ${
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
