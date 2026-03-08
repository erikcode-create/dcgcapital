import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { LogOut, Plus, Trash2, Users, BarChart3, MessageSquare, Heart, Send } from "lucide-react";
import { format } from "date-fns";

const AdminPortal = () => {
  const { user, signOut } = useAuth();
  const [deals, setDeals] = useState<any[]>([]);
  const [investors, setInvestors] = useState<any[]>([]);
  const [interests, setInterests] = useState<any[]>([]);
  const [allMessages, setAllMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newDeal, setNewDeal] = useState({ name: "", description: "", sector: "", target_return: "", status: "active" });
  const [dealDialogOpen, setDealDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedDealId, setSelectedDealId] = useState("");
  const [selectedInvestorId, setSelectedInvestorId] = useState("");
  const [replyContent, setReplyContent] = useState<Record<string, string>>({});
  const { toast } = useToast();

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    const [dealsRes, investorsRes, interestsRes, messagesRes] = await Promise.all([
      supabase.from("deals").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("*, user_roles(role)"),
      supabase.from("interest_expressions").select("*, deals(name), profiles:investor_id(full_name, email)"),
      supabase.from("messages").select("*, deals(name), profiles:sender_id(full_name, email)").order("created_at", { ascending: false }),
    ]);
    if (dealsRes.data) setDeals(dealsRes.data);
    if (investorsRes.data) setInvestors(investorsRes.data.filter((p: any) => p.user_roles?.some?.((r: any) => r.role === "investor") || !p.user_roles?.length));
    if (interestsRes.data) setInterests(interestsRes.data);
    if (messagesRes.data) setAllMessages(messagesRes.data);
    setLoading(false);
  };

  const handleCreateDeal = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("deals").insert({
      ...newDeal,
      created_by: user?.id,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Deal created" });
      setNewDeal({ name: "", description: "", sector: "", target_return: "", status: "active" });
      setDealDialogOpen(false);
      fetchAll();
    }
  };

  const handleDeleteDeal = async (id: string) => {
    const { error } = await supabase.from("deals").delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Deal deleted" });
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
      if (error.code === "23505") {
        toast({ title: "Already assigned" });
      } else {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      }
    } else {
      toast({ title: "Deal assigned" });
      setAssignDialogOpen(false);
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
            <div className="h-8 w-8 rounded bg-gradient-gold" />
            <div>
              <h2 className="font-display text-lg font-semibold text-card-foreground">Admin Portal</h2>
              <p className="font-body text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Fitzpatrick Capital Partners</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={signOut}>
            <LogOut className="mr-2 h-4 w-4" /> Sign Out
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-6 py-10">
        {/* Stats */}
        <div className="mb-10 grid gap-4 md:grid-cols-4">
          {[
            { label: "Active Deals", value: deals.filter(d => d.status === "active").length, icon: BarChart3 },
            { label: "Total Investors", value: investors.length, icon: Users },
            { label: "Interest Expressions", value: interests.length, icon: Heart },
            { label: "Messages", value: allMessages.length, icon: MessageSquare },
          ].map((stat, i) => (
            <Card key={i} className="border-border">
              <CardContent className="flex items-center gap-4 p-6">
                <stat.icon className="h-8 w-8 text-accent" />
                <div>
                  <p className="font-display text-2xl font-semibold text-card-foreground">{stat.value}</p>
                  <p className="font-body text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="deals">
          <TabsList className="mb-6">
            <TabsTrigger value="deals" className="font-body">Deals</TabsTrigger>
            <TabsTrigger value="investors" className="font-body">Investors</TabsTrigger>
            <TabsTrigger value="interest" className="font-body">Interest</TabsTrigger>
            <TabsTrigger value="messages" className="font-body">Messages</TabsTrigger>
          </TabsList>

          {/* Deals Tab */}
          <TabsContent value="deals">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="font-display text-2xl text-foreground">Deal Management</h2>
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
                <Dialog open={dealDialogOpen} onOpenChange={setDealDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="bg-gradient-gold text-accent-foreground"><Plus className="mr-2 h-4 w-4" />New Deal</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle className="font-display">Create New Deal</DialogTitle></DialogHeader>
                    <form onSubmit={handleCreateDeal} className="space-y-4">
                      <div><Label>Deal Name</Label><Input value={newDeal.name} onChange={(e) => setNewDeal({ ...newDeal, name: e.target.value })} required maxLength={200} className="mt-1" /></div>
                      <div><Label>Sector</Label><Input value={newDeal.sector} onChange={(e) => setNewDeal({ ...newDeal, sector: e.target.value })} maxLength={100} className="mt-1" /></div>
                      <div><Label>Target Return</Label><Input value={newDeal.target_return} onChange={(e) => setNewDeal({ ...newDeal, target_return: e.target.value })} maxLength={50} className="mt-1" placeholder="e.g. 25% IRR" /></div>
                      <div><Label>Description</Label><Textarea value={newDeal.description} onChange={(e) => setNewDeal({ ...newDeal, description: e.target.value })} maxLength={2000} className="mt-1" rows={4} /></div>
                      <div>
                        <Label>Status</Label>
                        <Select value={newDeal.status} onValueChange={(v) => setNewDeal({ ...newDeal, status: v })}>
                          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="under_review">Under Review</SelectItem>
                            <SelectItem value="closed">Closed</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button type="submit" className="w-full bg-gradient-gold text-accent-foreground">Create Deal</Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
            <Card className="border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-body">Name</TableHead>
                    <TableHead className="font-body">Sector</TableHead>
                    <TableHead className="font-body">Target Return</TableHead>
                    <TableHead className="font-body">Status</TableHead>
                    <TableHead className="font-body">Created</TableHead>
                    <TableHead className="font-body"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deals.map((deal) => (
                    <TableRow key={deal.id}>
                      <TableCell className="font-body font-medium">{deal.name}</TableCell>
                      <TableCell className="font-body text-muted-foreground">{deal.sector}</TableCell>
                      <TableCell className="font-body text-accent">{deal.target_return}</TableCell>
                      <TableCell><Badge variant="outline">{deal.status?.replace("_", " ")}</Badge></TableCell>
                      <TableCell className="font-body text-sm text-muted-foreground">{deal.created_at ? format(new Date(deal.created_at), "MMM d, yyyy") : ""}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteDeal(deal.id)} className="text-destructive hover:text-destructive">
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
            <h2 className="font-display mb-6 text-2xl text-foreground">Investor Directory</h2>
            <Card className="border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-body">Name</TableHead>
                    <TableHead className="font-body">Email</TableHead>
                    <TableHead className="font-body">Joined</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {investors.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell className="font-body font-medium">{inv.full_name || "—"}</TableCell>
                      <TableCell className="font-body text-muted-foreground">{inv.email || "—"}</TableCell>
                      <TableCell className="font-body text-sm text-muted-foreground">{inv.created_at ? format(new Date(inv.created_at), "MMM d, yyyy") : ""}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
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
                      <TableCell className="font-body font-medium">{(int.profiles as any)?.full_name || (int.profiles as any)?.email || "—"}</TableCell>
                      <TableCell className="font-body text-muted-foreground">{(int.deals as any)?.name || "—"}</TableCell>
                      <TableCell><Badge variant="outline">{int.status}</Badge></TableCell>
                      <TableCell className="font-body text-sm text-muted-foreground">{int.created_at ? format(new Date(int.created_at), "MMM d, yyyy") : ""}</TableCell>
                    </TableRow>
                  ))}
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
                        <p className="font-body text-sm font-medium text-foreground">{(msg.profiles as any)?.full_name || (msg.profiles as any)?.email}</p>
                        <p className="font-body text-xs text-muted-foreground">Re: {(msg.deals as any)?.name} · {msg.created_at ? format(new Date(msg.created_at), "MMM d, yyyy h:mm a") : ""}</p>
                      </div>
                    </div>
                    <p className="font-body mt-3 text-sm text-muted-foreground">{msg.content}</p>
                    <div className="mt-4 flex gap-2">
                      <Input
                        placeholder="Reply..."
                        value={replyContent[msg.id] || ""}
                        onChange={(e) => setReplyContent({ ...replyContent, [msg.id]: e.target.value })}
                        maxLength={1000}
                        className="text-sm"
                      />
                      <Button size="sm" variant="outline" onClick={() => handleReply(msg.id, msg.deal_id)}>
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {allMessages.length === 0 && (
                <Card className="border-border">
                  <CardContent className="py-16 text-center">
                    <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground/30" />
                    <p className="font-body mt-4 text-muted-foreground">No messages yet</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AdminPortal;
