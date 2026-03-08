import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { FileText, Save, CheckCircle2, User } from "lucide-react";
import { format } from "date-fns";

interface NdaManagerProps {
  investors: any[];
}

const NdaManager = ({ investors }: NdaManagerProps) => {
  const { toast } = useToast();
  const [template, setTemplate] = useState<any>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [signatures, setSignatures] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [templateRes, sigRes] = await Promise.all([
      supabase.from("nda_templates").select("*").eq("is_active", true).order("version", { ascending: false }).limit(1).single(),
      supabase.from("nda_signatures").select("*").order("signed_at", { ascending: false }),
    ]);
    if (templateRes.data) {
      setTemplate(templateRes.data);
      setEditTitle(templateRes.data.title);
      setEditContent(templateRes.data.content);
    }
    if (sigRes.data) setSignatures(sigRes.data);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!editTitle.trim() || !editContent.trim()) return;
    setSaving(true);

    if (template) {
      // Update existing
      const { error } = await supabase.from("nda_templates").update({
        title: editTitle.trim(),
        content: editContent.trim(),
        updated_at: new Date().toISOString(),
      }).eq("id", template.id);
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "NDA template updated" });
        setEditing(false);
        fetchData();
      }
    } else {
      // Create new
      const { error } = await supabase.from("nda_templates").insert({
        title: editTitle.trim(),
        content: editContent.trim(),
      });
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "NDA template created" });
        setEditing(false);
        fetchData();
      }
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl text-foreground">NDA / Data Room Agreement</h2>
        <Button
          variant={editing ? "ghost" : "outline"}
          size="sm"
          onClick={() => setEditing(!editing)}
        >
          {editing ? "Cancel" : "Edit Template"}
        </Button>
      </div>

      {/* Template Editor */}
      <Card className="border-border">
        <CardHeader>
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-accent" />
            {editing ? (
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                maxLength={200}
                className="font-display text-lg"
              />
            ) : (
              <CardTitle className="font-display text-lg">{template?.title || "No template"}</CardTitle>
            )}
          </div>
          {template && (
            <p className="font-body text-xs text-muted-foreground">
              Version {template.version} · Updated {template.updated_at ? format(new Date(template.updated_at), "MMM d, yyyy h:mm a") : "—"}
            </p>
          )}
        </CardHeader>
        <CardContent>
          {editing ? (
            <div className="space-y-4">
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={20}
                className="font-body text-sm leading-relaxed"
                placeholder="Enter the NDA contract language..."
              />
              <Button onClick={handleSave} disabled={saving} className="bg-gradient-royal text-accent-foreground">
                <Save className="mr-2 h-4 w-4" />{saving ? "Saving..." : "Save Template"}
              </Button>
            </div>
          ) : (
            <div className="max-h-[300px] overflow-y-auto rounded-lg border border-border bg-muted/30 p-6">
              <pre className="font-body text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                {template?.content || "No NDA template configured yet. Click 'Edit Template' to create one."}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>

      <Separator />

      {/* Signatures Table */}
      <div>
        <h3 className="font-display text-xl text-foreground mb-4">
          Signed Agreements
          <Badge variant="outline" className="ml-3 font-body">{signatures.length} signed</Badge>
        </h3>
        <Card className="border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-body">Investor</TableHead>
                <TableHead className="font-body">Signature Name</TableHead>
                <TableHead className="font-body">Date Signed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {signatures.map((sig) => {
                const inv = investors.find((i: any) => i.id === sig.investor_id);
                return (
                  <TableRow key={sig.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-body text-sm font-medium">{inv?.full_name || inv?.email || "Unknown"}</p>
                          {inv?.company && <p className="font-body text-xs text-muted-foreground">{inv.company}</p>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        <span className="font-body text-sm">{sig.signature_name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-body text-sm text-muted-foreground">
                      {sig.signed_at ? format(new Date(sig.signed_at), "MMM d, yyyy h:mm a") : "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
              {signatures.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="py-12 text-center font-body text-muted-foreground">
                    No investors have signed the NDA yet
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      </div>
    </div>
  );
};

export default NdaManager;
