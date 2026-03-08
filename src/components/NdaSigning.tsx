import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { FileText, PenTool } from "lucide-react";
import { format } from "date-fns";

interface NdaSigningProps {
  onSigned: () => void;
}

const NdaSigning = ({ onSigned }: NdaSigningProps) => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [template, setTemplate] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [signatureName, setSignatureName] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [signing, setSigning] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  useEffect(() => {
    fetchTemplate();
  }, []);

  useEffect(() => {
    if (profile?.full_name) {
      setSignatureName(profile.full_name);
    }
  }, [profile]);

  const fetchTemplate = async () => {
    const { data } = await supabase
      .from("nda_templates")
      .select("*")
      .eq("is_active", true)
      .order("version", { ascending: false })
      .limit(1)
      .single();
    if (data) setTemplate(data);
    setLoading(false);
  };

  // Canvas drawing for signature
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.strokeStyle = "hsl(var(--foreground))";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
  }, [template]);

  const getPos = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const startDraw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    setHasDrawn(true);
  };

  const stopDraw = () => setIsDrawing(false);

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const handleSign = async () => {
    if (!user || !template || !signatureName.trim() || !agreed || !hasDrawn) return;
    setSigning(true);
    const { error } = await supabase.from("nda_signatures").insert({
      investor_id: user.id,
      nda_template_id: template.id,
      signature_name: signatureName.trim(),
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "NDA signed successfully", description: "You now have access to the data room." });
      onSigned();
    }
    setSigning(false);
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
      </div>
    );
  }

  if (!template) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="font-body text-muted-foreground">No NDA available at this time. Please contact the team.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl py-10 px-6">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-accent/10">
          <FileText className="h-8 w-8 text-accent" />
        </div>
        <h1 className="font-display text-3xl font-light text-foreground">Data Room Access</h1>
        <p className="font-body mt-2 text-muted-foreground">
          Please review and sign the following agreement before accessing deal materials.
        </p>
      </div>

      <Card className="border-border mb-6">
        <CardHeader>
          <CardTitle className="font-display text-xl">{template.title}</CardTitle>
          <p className="font-body text-xs text-muted-foreground">Version {template.version} · Last updated {template.updated_at ? format(new Date(template.updated_at), "MMMM d, yyyy") : ""}</p>
        </CardHeader>
        <CardContent>
          <div className="max-h-[400px] overflow-y-auto rounded-lg border border-border bg-muted/30 p-6">
            <pre className="font-body text-sm text-foreground whitespace-pre-wrap leading-relaxed">
              {template.content}
            </pre>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border mb-6">
        <CardContent className="p-6 space-y-6">
          <div>
            <label className="font-body text-sm font-medium text-foreground">Full Legal Name</label>
            <Input
              value={signatureName}
              onChange={(e) => setSignatureName(e.target.value)}
              placeholder="Enter your full legal name"
              maxLength={200}
              className="mt-1"
            />
          </div>

          <div>
            <label className="font-body text-sm font-medium text-foreground mb-2 block">
              <PenTool className="inline h-4 w-4 mr-1" />Digital Signature
            </label>
            <div className="rounded-lg border-2 border-dashed border-border bg-background p-1">
              <canvas
                ref={canvasRef}
                width={600}
                height={150}
                className="w-full cursor-crosshair touch-none"
                onMouseDown={startDraw}
                onMouseMove={draw}
                onMouseUp={stopDraw}
                onMouseLeave={stopDraw}
                onTouchStart={startDraw}
                onTouchMove={draw}
                onTouchEnd={stopDraw}
              />
            </div>
            <div className="mt-2 flex items-center justify-between">
              <p className="font-body text-xs text-muted-foreground">Draw your signature above</p>
              <Button variant="ghost" size="sm" onClick={clearSignature} className="text-xs">Clear</Button>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Checkbox
              id="agree"
              checked={agreed}
              onCheckedChange={(v) => setAgreed(v === true)}
            />
            <label htmlFor="agree" className="font-body text-sm text-muted-foreground leading-relaxed cursor-pointer">
              I have read and agree to the terms of this Non-Disclosure Agreement. I understand that my electronic signature is legally binding.
            </label>
          </div>

          <div className="flex items-center justify-between border-t border-border pt-4">
            <p className="font-body text-xs text-muted-foreground">
              Date: {format(new Date(), "MMMM d, yyyy")}
            </p>
            <Button
              onClick={handleSign}
              disabled={!signatureName.trim() || !agreed || !hasDrawn || signing}
              className="bg-gradient-royal text-accent-foreground px-8"
            >
              {signing ? "Signing..." : "Sign Agreement"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default NdaSigning;
