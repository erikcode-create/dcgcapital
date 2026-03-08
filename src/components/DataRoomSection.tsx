import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  Download, Upload, FileText, Image, File, FileSpreadsheet,
  Loader2, Plus, Trash2, FolderOpen
} from "lucide-react";

const DOCUMENT_TYPES = [
  { key: "pitch_deck", label: "Pitch Deck" },
  { key: "financials", label: "Financials" },
  { key: "investment_memo", label: "Investment Memo / CIM" },
  { key: "legal", label: "Legal / NDA" },
  { key: "due_diligence", label: "Due Diligence" },
  { key: "market_research", label: "Market Research" },
  { key: "other", label: "Other" },
];

const formatFileSize = (bytes: number) => {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const getFileIcon = (contentType: string, name: string) => {
  if (contentType?.startsWith("image/")) return Image;
  if (contentType?.includes("pdf")) return FileText;
  if (contentType?.includes("spreadsheet") || contentType?.includes("excel") || name?.endsWith(".xlsx") || name?.endsWith(".csv")) return FileSpreadsheet;
  return File;
};

const getDocTypeBadge = (docType: string) => {
  const dt = DOCUMENT_TYPES.find(d => d.key === docType);
  return dt?.label || docType || "Other";
};

interface DataRoomSectionProps {
  dealId: string;
  dealName: string;
  documents: any[];
  onUpload: (dealId: string, file: File, docType: string) => Promise<void>;
  onRefresh: (dealId: string) => void;
  uploading: boolean;
}

const DataRoomSection = ({ dealId, dealName, documents, onUpload, onRefresh, uploading }: DataRoomSectionProps) => {
  const [uploadDocType, setUploadDocType] = useState("other");
  const { toast } = useToast();

  const handleDownload = async (doc: any) => {
    try {
      const { data, error } = await supabase.storage.from("pitch-decks").download(doc.file_path);
      if (error || !data) {
        toast({ title: "Download failed", description: error?.message || "Unknown error", variant: "destructive" });
        return;
      }
      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = doc.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      toast({ title: "Download failed", description: err.message, variant: "destructive" });
    }
  };

  const handleDelete = async (docId: string) => {
    const { error } = await supabase.from("deal_documents").delete().eq("id", docId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Document removed" });
      onRefresh(dealId);
    }
  };

  // Group documents by type
  const grouped = DOCUMENT_TYPES.map(dt => ({
    ...dt,
    docs: documents.filter(d => d.document_type === dt.key),
  })).filter(g => g.docs.length > 0);

  const ungrouped = documents.filter(d => !DOCUMENT_TYPES.find(dt => dt.key === d.document_type));
  if (ungrouped.length > 0) {
    grouped.push({ key: "uncategorized", label: "Uncategorized", docs: ungrouped });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="font-body text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <FolderOpen className="h-3.5 w-3.5" />
          Data Room ({documents.length})
        </p>
      </div>

      {/* Upload Section */}
      <div className="mb-4 rounded-lg border border-dashed border-border p-3">
        <div className="flex items-center gap-2 mb-2">
          <Select value={uploadDocType} onValueChange={setUploadDocType}>
            <SelectTrigger className="h-7 w-[180px] text-xs">
              <SelectValue placeholder="Document type" />
            </SelectTrigger>
            <SelectContent>
              {DOCUMENT_TYPES.map(dt => (
                <SelectItem key={dt.key} value={dt.key} className="text-xs">{dt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {uploading ? (
            <Button size="sm" variant="outline" disabled className="h-7 text-xs">
              <Loader2 className="mr-1 h-3 w-3 animate-spin" />Uploading...
            </Button>
          ) : (
            <label className="cursor-pointer">
              <Button size="sm" variant="outline" className="h-7 text-xs pointer-events-none">
                <Upload className="mr-1 h-3 w-3" />Upload Document
              </Button>
              <input
                type="file"
                className="hidden"
                accept=".pdf,.pptx,.ppt,.docx,.xlsx,.xls,.csv,.png,.jpg,.jpeg,.gif,.txt"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onUpload(dealId, file, uploadDocType);
                  e.target.value = "";
                }}
              />
            </label>
          )}
        </div>
        <p className="font-body text-[10px] text-muted-foreground">PDF, PPTX, DOCX, XLSX, CSV, images up to 20MB</p>
      </div>

      {/* Document List */}
      {documents.length === 0 ? (
        <p className="font-body text-xs text-muted-foreground text-center py-4">No documents yet. Upload files to build the data room.</p>
      ) : (
        <div className="space-y-4">
          {grouped.map((group) => (
            <div key={group.key}>
              <p className="font-body text-[11px] font-medium text-muted-foreground mb-1.5">{group.label}</p>
              <div className="space-y-1.5">
                {group.docs.map((doc: any) => {
                  const IconComponent = getFileIcon(doc.content_type, doc.file_name);
                  return (
                    <div
                      key={doc.id}
                      className="flex items-center gap-2.5 rounded-lg border border-border bg-muted/20 px-3 py-2 hover:bg-muted/50 transition-colors group"
                    >
                      <div className="flex h-7 w-7 items-center justify-center rounded bg-accent/10 flex-shrink-0">
                        <IconComponent className="h-4 w-4 text-accent" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-body text-xs font-medium truncate text-card-foreground">{doc.file_name}</p>
                        <div className="flex items-center gap-2">
                          {doc.file_size > 0 && <span className="font-body text-[10px] text-muted-foreground">{formatFileSize(doc.file_size)}</span>}
                          {doc.source === "email" && <Badge variant="outline" className="text-[9px] h-4 px-1">Email</Badge>}
                          {doc.created_at && <span className="font-body text-[10px] text-muted-foreground">{format(new Date(doc.created_at), "MMM d")}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => handleDownload(doc)}>
                          <Download className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive" onClick={() => handleDelete(doc.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DataRoomSection;
