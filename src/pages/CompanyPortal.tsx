// ABOUTME: Company-facing portal where invited companies upload documents for a deal.
// ABOUTME: Shows a grouped document request checklist with upload functionality and progress tracking.

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import {
  Upload, CheckCircle2, Clock, FileText, LogOut, Building2,
  ChevronDown, ChevronRight, Loader2, AlertCircle
} from "lucide-react";

interface DataRequestItem {
  id: string;
  deal_id: string;
  category: string;
  label: string;
  description: string | null;
  sort_order: number;
  status: string;
  uploaded_document_id: string | null;
  created_at: string;
  updated_at: string;
}

interface Deal {
  id: string;
  name: string;
  description: string | null;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  pending: { label: "Pending", color: "bg-muted text-muted-foreground", icon: Clock },
  uploaded: { label: "Uploaded", color: "bg-accent/10 text-accent", icon: Upload },
  approved: { label: "Approved", color: "bg-green-100 text-green-700", icon: CheckCircle2 },
  rejected: { label: "Needs Revision", color: "bg-destructive/10 text-destructive", icon: AlertCircle },
};

const CompanyPortal = () => {
  const { user, profile, signOut } = useAuth();
  const { toast } = useToast();

  const [deal, setDeal] = useState<Deal | null>(null);
  const [items, setItems] = useState<DataRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingItemId, setUploadingItemId] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    // Get the deal assigned to this company user
    const { data: assignments } = await supabase
      .from("deal_assignments")
      .select("deal_id")
      .eq("investor_id", user.id);

    if (!assignments || assignments.length === 0) {
      setLoading(false);
      return;
    }

    const dealId = assignments[0].deal_id;

    const [dealRes, itemsRes] = await Promise.all([
      supabase.from("deals").select("id, name, description").eq("id", dealId).single(),
      supabase.from("data_request_items").select("*").eq("deal_id", dealId).order("sort_order"),
    ]);

    if (dealRes.data) setDeal(dealRes.data);
    if (itemsRes.data) {
      setItems(itemsRes.data as DataRequestItem[]);
      // Expand all categories by default
      const categories = new Set(itemsRes.data.map((i: any) => i.category));
      setExpandedCategories(categories as Set<string>);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleUpload = async (item: DataRequestItem) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.txt,.zip";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file || !deal || !user) return;

      setUploadingItemId(item.id);

      try {
        // Upload to storage
        const filePath = `${deal.id}/company/${item.category.toLowerCase().replace(/\s+/g, "-")}/${Date.now()}_${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from("pitch-decks")
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        // Create deal_documents record
        const { data: docData, error: docError } = await supabase
          .from("deal_documents")
          .insert({
            deal_id: deal.id,
            file_name: file.name,
            file_path: filePath,
            file_size: file.size,
            content_type: file.type || "application/octet-stream",
            document_type: item.category.toLowerCase().replace(/\s+/g, "_"),
            uploaded_by: user.id,
            source: "company_portal",
          })
          .select("id")
          .single();

        if (docError) throw docError;

        // Update the data request item to link the uploaded document
        const { error: updateError } = await supabase
          .from("data_request_items")
          .update({
            status: "uploaded",
            uploaded_document_id: docData.id,
          })
          .eq("id", item.id);

        if (updateError) throw updateError;

        toast({ title: "Document uploaded", description: `${file.name} has been uploaded successfully.` });
        fetchData();
      } catch (err: any) {
        console.error("Upload error:", err);
        toast({ title: "Upload failed", description: err.message, variant: "destructive" });
      } finally {
        setUploadingItemId(null);
      }
    };
    input.click();
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  };

  // Group items by category
  const groupedItems = items.reduce<Record<string, DataRequestItem[]>>((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  const totalItems = items.length;
  const completedItems = items.filter((i) => i.status === "uploaded" || i.status === "approved").length;
  const progressPercent = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
      </div>
    );
  }

  if (!deal) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Card className="max-w-md border-border">
          <CardContent className="p-8 text-center">
            <Building2 className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <h2 className="font-display text-xl text-foreground">No Deal Assigned</h2>
            <p className="font-body mt-2 text-sm text-muted-foreground">
              You don't have any active data room assignments. Please contact your deal representative.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card px-6 py-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div>
            <h1 className="font-display text-2xl text-foreground">Data Room</h1>
            <p className="font-body text-sm text-muted-foreground">
              {deal.name} · Fitzpatrick Capital Partners
            </p>
          </div>
          <div className="flex items-center gap-4">
            <span className="font-body text-sm text-muted-foreground">
              {profile?.full_name || profile?.email || user?.email}
            </span>
            <Button variant="outline" size="sm" onClick={signOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8">
        {/* Welcome & Progress */}
        <Card className="mb-8 border-border">
          <CardContent className="p-6">
            <h2 className="font-display text-lg text-foreground mb-2">Document Request</h2>
            <p className="font-body text-sm text-muted-foreground mb-4">
              Please upload the requested documents below. All information will be treated with the utmost confidentiality.
            </p>
            <div className="flex items-center gap-4">
              <Progress value={progressPercent} className="flex-1" />
              <span className="font-body text-sm font-medium text-foreground whitespace-nowrap">
                {completedItems} of {totalItems} completed
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Grouped checklist */}
        <div className="space-y-4">
          {Object.entries(groupedItems).map(([category, categoryItems]) => {
            const isExpanded = expandedCategories.has(category);
            const categoryCompleted = categoryItems.filter(
              (i) => i.status === "uploaded" || i.status === "approved"
            ).length;

            return (
              <Card key={category} className="border-border">
                <CardHeader
                  className="cursor-pointer select-none py-4"
                  onClick={() => toggleCategory(category)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                      <CardTitle className="font-display text-base">{category}</CardTitle>
                    </div>
                    <Badge variant="outline" className="font-body text-xs">
                      {categoryCompleted}/{categoryItems.length}
                    </Badge>
                  </div>
                </CardHeader>

                {isExpanded && (
                  <CardContent className="pt-0">
                    <div className="space-y-3">
                      {categoryItems.map((item) => {
                        const config = STATUS_CONFIG[item.status] || STATUS_CONFIG.pending;
                        const StatusIcon = config.icon;
                        const isUploading = uploadingItemId === item.id;

                        return (
                          <div
                            key={item.id}
                            className="flex items-start justify-between gap-4 rounded-lg border border-border p-4"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <StatusIcon className="h-4 w-4 shrink-0" />
                                <span className="font-body text-sm font-medium text-foreground">
                                  {item.label}
                                </span>
                              </div>
                              {item.description && (
                                <p className="font-body text-xs text-muted-foreground ml-6">
                                  {item.description}
                                </p>
                              )}
                              {item.status !== "pending" && (
                                <Badge className={`mt-2 ml-6 text-[10px] ${config.color}`}>
                                  {config.label}
                                </Badge>
                              )}
                            </div>

                            <div className="shrink-0">
                              {item.status === "pending" || item.status === "rejected" ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={isUploading}
                                  onClick={() => handleUpload(item)}
                                >
                                  {isUploading ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  ) : (
                                    <Upload className="mr-2 h-4 w-4" />
                                  )}
                                  {isUploading ? "Uploading..." : "Upload"}
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleUpload(item)}
                                >
                                  <FileText className="mr-2 h-4 w-4" />
                                  Replace
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      </main>
    </div>
  );
};

export default CompanyPortal;
