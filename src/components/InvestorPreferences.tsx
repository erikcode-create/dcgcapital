// ABOUTME: Investor deal preferences editor with multi-select and single-select dropdowns.
// ABOUTME: Auto-saves preferences to the investor_preferences table on every change.
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Settings, ChevronDown, X } from "lucide-react";

const REGIONS = ["North America", "Europe", "Asia-Pacific", "Middle East", "Latin America", "Africa"];
const SECTORS = ["Technology", "Healthcare", "Financial Services", "Energy", "Consumer", "Industrials", "Real Estate", "Infrastructure"];
const DEAL_TYPES = ["Buyout", "Growth Equity", "Venture", "Recapitalization", "Distressed", "Add-on"];
const CATEGORIES = ["Equity", "Debt", "Revenue Seeking"];
const REVENUE_SIZES = ["< $1M", "$1M–$10M", "$10M–$50M", "$50M–$100M", "$100M–$500M", "$500M+"];
const EBITDA_RANGES = ["< $1M", "$1M–$5M", "$5M–$25M", "$25M–$50M", "$50M+"];
const EV_RANGES = ["< $10M", "$10M–$50M", "$50M–$250M", "$250M–$1B", "$1B+"];
const REVENUE_STAGES = ["Pre Revenue", "Post Revenue", "Both"];
const CHECK_SIZES = ["< $1M", "$1M–$5M", "$5M–$25M", "$25M–$50M", "$50M+"];

interface Preferences {
  id?: string;
  investor_id: string;
  preferred_regions: string[];
  preferred_sectors: string[];
  preferred_deal_types: string[];
  preferred_categories: string[];
  revenue_size: string | null;
  ebitda_range: string | null;
  enterprise_value_range: string | null;
  revenue_stage_preference: string;
  check_size: string | null;
}

const defaultPrefs = (userId: string): Preferences => ({
  investor_id: userId,
  preferred_regions: [],
  preferred_sectors: [],
  preferred_deal_types: [],
  preferred_categories: [],
  revenue_size: null,
  ebitda_range: null,
  enterprise_value_range: null,
  revenue_stage_preference: "Both",
  check_size: null,
});

interface MultiSelectDropdownProps {
  label: string;
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
}

const MultiSelectDropdown = ({ label, options, selected, onChange }: MultiSelectDropdownProps) => {
  const toggle = (option: string) => {
    onChange(
      selected.includes(option)
        ? selected.filter((s) => s !== option)
        : [...selected, option]
    );
  };

  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-between font-normal text-sm h-9"
          >
            <span className="truncate">
              {selected.length === 0 ? "Select..." : `${selected.length} selected`}
            </span>
            <ChevronDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[220px] p-2" align="start">
          <div className="space-y-1 max-h-[200px] overflow-y-auto">
            {options.map((option) => (
              <label
                key={option}
                className="flex items-center gap-2 rounded px-2 py-1.5 text-sm cursor-pointer hover:bg-muted"
              >
                <Checkbox
                  checked={selected.includes(option)}
                  onCheckedChange={() => toggle(option)}
                />
                {option}
              </label>
            ))}
          </div>
        </PopoverContent>
      </Popover>
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1">
          {selected.map((s) => (
            <Badge
              key={s}
              variant="secondary"
              className="text-xs cursor-pointer hover:bg-destructive/10"
              onClick={() => toggle(s)}
            >
              {s} <X className="ml-1 h-2.5 w-2.5" />
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
};

interface InvestorPreferencesProps {
  userId: string;
  readOnly?: boolean;
}

const InvestorPreferences = ({ userId, readOnly = false }: InvestorPreferencesProps) => {
  const [prefs, setPrefs] = useState<Preferences>(defaultPrefs(userId));
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("investor_preferences")
        .select("*")
        .eq("investor_id", userId)
        .maybeSingle();
      if (data) {
        setPrefs({
          id: data.id,
          investor_id: data.investor_id,
          preferred_regions: (data.preferred_regions as string[]) || [],
          preferred_sectors: (data.preferred_sectors as string[]) || [],
          preferred_deal_types: (data.preferred_deal_types as string[]) || [],
          preferred_categories: (data.preferred_categories as string[]) || [],
          revenue_size: data.revenue_size,
          ebitda_range: data.ebitda_range,
          enterprise_value_range: data.enterprise_value_range,
          revenue_stage_preference: data.revenue_stage_preference || "Both",
          check_size: data.check_size,
        });
      }
      setLoaded(true);
    };
    load();
  }, [userId]);

  const save = useCallback(async (updated: Preferences) => {
    setSaving(true);
    const payload = {
      investor_id: updated.investor_id,
      preferred_regions: updated.preferred_regions,
      preferred_sectors: updated.preferred_sectors,
      preferred_deal_types: updated.preferred_deal_types,
      preferred_categories: updated.preferred_categories,
      revenue_size: updated.revenue_size,
      ebitda_range: updated.ebitda_range,
      enterprise_value_range: updated.enterprise_value_range,
      revenue_stage_preference: updated.revenue_stage_preference,
      check_size: updated.check_size,
    };

    if (updated.id) {
      const { error } = await supabase
        .from("investor_preferences")
        .update(payload)
        .eq("id", updated.id);
      if (error) {
        toast({ title: "Error saving preferences", description: error.message, variant: "destructive" });
      }
    } else {
      const { data, error } = await supabase
        .from("investor_preferences")
        .insert(payload)
        .select("id")
        .single();
      if (error) {
        toast({ title: "Error saving preferences", description: error.message, variant: "destructive" });
      } else if (data) {
        updated.id = data.id;
      }
    }
    setSaving(false);
  }, [toast]);

  const updateField = <K extends keyof Preferences>(key: K, value: Preferences[K]) => {
    const updated = { ...prefs, [key]: value };
    setPrefs(updated);
    save(updated);
  };

  if (!loaded) return null;

  return (
    <Card className="border-border">
      <CardHeader className="pb-4">
        <CardTitle className="font-display text-lg flex items-center gap-2 text-card-foreground">
          <Settings className="h-4 w-4 text-muted-foreground" />
          {readOnly ? "Deal Preferences" : "My Deal Preferences"}
          {saving && <span className="text-xs font-normal text-muted-foreground ml-2">Saving...</span>}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {/* Multi-select dropdowns */}
          <MultiSelectDropdown
            label="Regions"
            options={REGIONS}
            selected={prefs.preferred_regions}
            onChange={(v) => !readOnly && updateField("preferred_regions", v)}
          />
          <MultiSelectDropdown
            label="Sectors"
            options={SECTORS}
            selected={prefs.preferred_sectors}
            onChange={(v) => !readOnly && updateField("preferred_sectors", v)}
          />
          <MultiSelectDropdown
            label="Deal Types"
            options={DEAL_TYPES}
            selected={prefs.preferred_deal_types}
            onChange={(v) => !readOnly && updateField("preferred_deal_types", v)}
          />
          <MultiSelectDropdown
            label="Categories"
            options={CATEGORIES}
            selected={prefs.preferred_categories}
            onChange={(v) => !readOnly && updateField("preferred_categories", v)}
          />

          {/* Single-select dropdowns */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Revenue Size</Label>
            <Select
              value={prefs.revenue_size || ""}
              onValueChange={(v) => !readOnly && updateField("revenue_size", v)}
              disabled={readOnly}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                {REVENUE_SIZES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">EBITDA Range</Label>
            <Select
              value={prefs.ebitda_range || ""}
              onValueChange={(v) => !readOnly && updateField("ebitda_range", v)}
              disabled={readOnly}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                {EBITDA_RANGES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Enterprise Value</Label>
            <Select
              value={prefs.enterprise_value_range || ""}
              onValueChange={(v) => !readOnly && updateField("enterprise_value_range", v)}
              disabled={readOnly}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                {EV_RANGES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Revenue Stage</Label>
            <Select
              value={prefs.revenue_stage_preference}
              onValueChange={(v) => !readOnly && updateField("revenue_stage_preference", v)}
              disabled={readOnly}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                {REVENUE_STAGES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Check Size</Label>
            <Select
              value={prefs.check_size || ""}
              onValueChange={(v) => !readOnly && updateField("check_size", v)}
              disabled={readOnly}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                {CHECK_SIZES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default InvestorPreferences;
