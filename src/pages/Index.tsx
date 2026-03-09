// ABOUTME: Public homepage for Fitzpatrick Capital Partners - growth capital and alternative financing.
// ABOUTME: Features hero, approach pillars, capital solutions, target profile, comparison, about, and deal submission.

import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { Link, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowRight, Shield, TrendingUp, DollarSign, Zap, Building2,
  Cpu, Heart, Fuel, Upload, Loader2, ChevronRight, Lock,
  Check, ArrowUpRight
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const isPreviewMode = () => {
  const hostname = window.location.hostname;
  return hostname.includes("preview") && hostname.endsWith(".lovable.app");
};

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.12, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] },
  }),
};

const stagger = {
  visible: { transition: { staggerChildren: 0.08 } },
};

// Animated counter component for hero stats
const AnimatedNumber = ({ target, suffix = "" }: { target: number; suffix?: string }) => {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (v) => {
    if (target >= 100) return Math.round(v).toLocaleString();
    if (target >= 10) return v.toFixed(1);
    return v.toFixed(1);
  });
  const ref = useRef(false);

  useEffect(() => {
    if (!ref.current) {
      ref.current = true;
      animate(count, target, { duration: 2, ease: "easeOut" });
    }
  }, [count, target]);

  return (
    <span>
      <motion.span>{rounded}</motion.span>{suffix}
    </span>
  );
};

const Index = () => {
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [pitchFile, setPitchFile] = useState<File | null>(null);
  const [form, setForm] = useState({
    company_name: "",
    industry: "",
    annual_revenue: "",
    funding_needed: "",
    contact_name: "",
    contact_email: "",
    contact_phone: "",
    notes: "",
  });

  const { toast } = useToast();

  if (isPreviewMode()) {
    return <Navigate to="/admin" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      let pitchDeckPath: string | null = null;

      // Upload pitch deck if provided
      if (pitchFile) {
        const filePath = `submissions/${Date.now()}-${pitchFile.name}`;
        const { error: uploadError } = await supabase.storage.from("pitch-decks").upload(filePath, pitchFile);
        if (uploadError) {
          console.error("Upload error:", uploadError);
        } else {
          pitchDeckPath = filePath;
        }
      }

      // Call edge function to handle submission + email
      const { data, error } = await supabase.functions.invoke("submit-deal", {
        body: { ...form, pitch_deck_path: pitchDeckPath },
      });

      if (error) throw error;

      setSubmitted(true);
      toast({ title: "Opportunity submitted", description: "We'll review and be in touch shortly." });
    } catch (err: any) {
      toast({ title: "Submission failed", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const PILLARS = [
    {
      icon: Shield,
      title: "Preserve Equity",
      desc: "Helping companies delay equity raises until stronger valuations, protecting founder and shareholder ownership.",
    },
    {
      icon: TrendingUp,
      title: "Strategic Capital",
      desc: "Connecting companies with lenders and partners aligned with long-term growth trajectories.",
    },
    {
      icon: Zap,
      title: "Accelerated Growth",
      desc: "Structured capital designed to scale companies faster without traditional venture constraints.",
    },
  ];

  const SOLUTIONS = [
    {
      title: "Growth Debt",
      desc: "Flexible financing for scaling companies with strong revenue and clear growth trajectories.",
      detail: "Term loans and credit facilities structured around your growth metrics, not your cap table.",
    },
    {
      title: "Revenue-Based Financing",
      desc: "Capital repaid through a percentage of revenue — aligned with your business performance.",
      detail: "No dilution, no board seats. Payments flex with your revenue, providing breathing room during seasonal fluctuations.",
    },
    {
      title: "Strategic Funding",
      desc: "Partnership capital aligned with operational growth and market expansion.",
      detail: "Structured partnerships that bring capital alongside strategic value — distribution, partnerships, and market access.",
    },
    {
      title: "Structured Capital",
      desc: "Hybrid structures tailored for companies between traditional debt and equity.",
      detail: "Convertible notes, mezzanine facilities, and custom structures designed for your specific growth stage.",
    },
  ];

  const SECTORS = [
    { icon: Cpu, label: "Technology" },
    { icon: Heart, label: "Healthcare" },
    { icon: Fuel, label: "Energy" },
    { icon: Shield, label: "Defense" },
  ];

  const [expandedSolution, setExpandedSolution] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 z-50 w-full border-b border-border/40 bg-background/90 backdrop-blur-xl">
        <div className="container mx-auto flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-sm bg-gradient-royal" />
            <div>
              <span className="font-display text-lg font-semibold tracking-tight text-foreground">Fitzpatrick</span>
              <span className="font-body ml-1.5 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Capital Partners</span>
            </div>
          </div>
          <div className="hidden items-center gap-6 md:flex">
            <a href="#approach" className="font-body text-xs uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground">Approach</a>
            <a href="#solutions" className="font-body text-xs uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground">Solutions</a>
            <a href="#about" className="font-body text-xs uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground">About</a>
            <a href="#submit" className="font-body text-xs uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground">Submit Deal</a>
            <Link to="/login">
              <Button variant="outline" size="sm" className="border-accent/40 font-body text-xs text-accent hover:bg-accent hover:text-accent-foreground">
                <Lock className="mr-1.5 h-3 w-3" />
                Investor Portal
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative flex min-h-[90vh] items-center overflow-hidden bg-gradient-dark pt-16">
        {/* Animated grid lines background */}
        <div className="absolute inset-0 opacity-[0.04]">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
                <path d="M 60 0 L 0 0 0 60" fill="none" stroke="hsl(270 50% 60%)" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>
        {/* Subtle glow accents */}
        <div className="absolute left-1/3 top-1/4 h-[500px] w-[500px] rounded-full bg-accent/5 blur-[150px]" />
        <div className="absolute bottom-1/3 right-1/4 h-[300px] w-[300px] rounded-full bg-accent/3 blur-[120px]" />

        <div className="container relative z-10 mx-auto px-6">
          <div className="mx-auto max-w-4xl">
            <motion.p
              initial="hidden" animate="visible" variants={fadeUp} custom={0}
              className="font-body mb-6 text-xs uppercase tracking-[0.3em] text-royal-light"
            >
              Alternative Capital Solutions
            </motion.p>
            <motion.h1
              initial="hidden" animate="visible" variants={fadeUp} custom={1}
              className="font-display text-5xl font-light leading-[1.1] text-primary-foreground md:text-6xl lg:text-7xl"
            >
              Growth Capital Without Early{" "}
              <span className="text-gradient-royal font-medium">Equity Dilution</span>
            </motion.h1>
            <motion.p
              initial="hidden" animate="visible" variants={fadeUp} custom={2}
              className="font-body mt-8 max-w-2xl text-base leading-relaxed text-primary-foreground/50 md:text-lg"
            >
              Fitzpatrick Capital Partners helps growth-stage companies access venture debt,
              revenue-based financing, and strategic capital to scale faster while preserving ownership.
            </motion.p>
            <motion.div
              initial="hidden" animate="visible" variants={fadeUp} custom={3}
              className="mt-10 flex flex-wrap items-center gap-4"
            >
              <a href="#solutions">
                <Button size="lg" className="bg-gradient-royal font-body text-sm text-accent-foreground hover:opacity-90">
                  Explore Funding Solutions <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </a>
              <Link to="/login">
                <Button size="lg" variant="outline" className="border-primary-foreground/20 font-body text-sm text-primary-foreground/70 hover:bg-primary-foreground/5 hover:text-primary-foreground">
                  Investor Portal Login <ArrowUpRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </motion.div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent" />
      </section>

      {/* Our Approach — 3 Pillars */}
      <section id="approach" className="py-28">
        <div className="container mx-auto px-6">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
            <p className="font-body mb-3 text-xs uppercase tracking-[0.2em] text-accent">Our Approach</p>
            <h2 className="font-display text-4xl font-light text-foreground md:text-5xl">
              Capital Strategy Built for <span className="text-gradient-royal font-medium">Growth</span>
            </h2>
          </motion.div>
          <div className="mt-16 grid gap-6 md:grid-cols-3">
            {PILLARS.map((p, i) => (
              <motion.div
                key={i}
                initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i + 1}
                className="group rounded-lg border border-border bg-card p-8 transition-all hover:border-accent/20 hover:shadow-lg hover:shadow-accent/5"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-accent/10">
                  <p.icon className="h-5 w-5 text-accent" />
                </div>
                <h3 className="font-display mt-6 text-2xl font-medium text-card-foreground">{p.title}</h3>
                <p className="font-body mt-3 text-sm leading-relaxed text-muted-foreground">{p.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Capital Solutions — Card Grid */}
      <section id="solutions" className="bg-gradient-dark py-28">
        <div className="container mx-auto px-6">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
            <p className="font-body mb-3 text-xs uppercase tracking-[0.2em] text-royal-light">Capital Solutions</p>
            <h2 className="font-display text-4xl font-light text-primary-foreground md:text-5xl">
              Structured for <span className="text-gradient-royal font-medium">Your Growth</span>
            </h2>
          </motion.div>
          <div className="mt-16 grid gap-4 md:grid-cols-2">
            {SOLUTIONS.map((s, i) => (
              <motion.div
                key={i}
                initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i + 1}
                className="group cursor-pointer rounded-lg border border-primary-foreground/8 bg-primary-foreground/[0.03] p-8 transition-all hover:border-primary-foreground/15 hover:bg-primary-foreground/[0.06]"
                onClick={() => setExpandedSolution(expandedSolution === i ? null : i)}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-display text-xl font-medium text-primary-foreground">{s.title}</h3>
                    <p className="font-body mt-2 text-sm text-primary-foreground/50">{s.desc}</p>
                  </div>
                  <ChevronRight className={`h-5 w-5 text-primary-foreground/30 transition-transform ${expandedSolution === i ? "rotate-90" : ""}`} />
                </div>
                {expandedSolution === i && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="font-body mt-4 border-t border-primary-foreground/10 pt-4 text-sm leading-relaxed text-primary-foreground/40"
                  >
                    {s.detail}
                  </motion.p>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Who We Work With */}
      <section className="py-28">
        <div className="container mx-auto px-6">
          <div className="grid gap-16 md:grid-cols-2">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
              <p className="font-body mb-3 text-xs uppercase tracking-[0.2em] text-accent">Who We Work With</p>
              <h2 className="font-display text-4xl font-light text-foreground md:text-5xl">
                Target Company <span className="text-gradient-royal font-medium">Profile</span>
              </h2>
              <div className="mt-10 space-y-4">
                {[
                  "Growth-stage companies",
                  "$5M – $100M annual revenue",
                  "Recurring revenue or strong contract base",
                  "Clear path to profitability or already profitable",
                ].map((item, i) => (
                  <motion.div key={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i + 1}
                    className="flex items-center gap-3"
                  >
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/10">
                      <Check className="h-3 w-3 text-accent" />
                    </div>
                    <span className="font-body text-sm text-foreground">{item}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={2}>
              <p className="font-body mb-4 text-xs uppercase tracking-[0.2em] text-muted-foreground">Key Sectors</p>
              <div className="grid grid-cols-2 gap-3">
                {SECTORS.map((s, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-lg border border-border bg-card p-5">
                    <s.icon className="h-5 w-5 text-accent" />
                    <span className="font-body text-sm font-medium text-card-foreground">{s.label}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Why Alternative Capital — Comparison */}
      <section className="bg-gradient-dark py-28">
        <div className="container mx-auto px-6">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0} className="mx-auto max-w-3xl text-center">
            <p className="font-body mb-3 text-xs uppercase tracking-[0.2em] text-royal-light">Why Alternative Capital</p>
            <h2 className="font-display text-4xl font-light text-primary-foreground md:text-5xl">
              A Better Path to <span className="text-gradient-royal font-medium">Scale</span>
            </h2>
          </motion.div>
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={1}
            className="mx-auto mt-16 max-w-3xl overflow-hidden rounded-lg border border-primary-foreground/10"
          >
            <table className="w-full">
              <thead>
                <tr className="border-b border-primary-foreground/10 bg-primary-foreground/[0.03]">
                  <th className="font-body px-6 py-4 text-left text-xs uppercase tracking-wider text-primary-foreground/40"></th>
                  <th className="font-body px-6 py-4 text-center text-xs uppercase tracking-wider text-primary-foreground/40">Traditional VC</th>
                  <th className="font-body px-6 py-4 text-center text-xs uppercase tracking-wider text-royal-light">Fitzpatrick Capital</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-primary-foreground/5">
                {[
                  { label: "Ownership", vc: "Significant dilution", fc: "Equity preservation" },
                  { label: "Timeline", vc: "Long fundraising cycles", fc: "Faster access to capital" },
                  { label: "Control", vc: "Board seats & control loss", fc: "Founder ownership maintained" },
                  { label: "Alignment", vc: "Exit-driven pressure", fc: "Growth-aligned structures" },
                ].map((row, i) => (
                  <tr key={i}>
                    <td className="font-body px-6 py-4 text-sm font-medium text-primary-foreground/70">{row.label}</td>
                    <td className="font-body px-6 py-4 text-center text-sm text-primary-foreground/30">{row.vc}</td>
                    <td className="font-body px-6 py-4 text-center text-sm font-medium text-primary-foreground/80">{row.fc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        </div>
      </section>

      {/* About */}
      <section id="about" className="py-28">
        <div className="container mx-auto px-6">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0} className="mx-auto max-w-3xl text-center">
            <p className="font-body mb-3 text-xs uppercase tracking-[0.2em] text-accent">About</p>
            <h2 className="font-display text-4xl font-light text-foreground md:text-5xl">
              Helping Growth-Stage Companies <span className="text-gradient-royal font-medium">Unlock Capital</span>
            </h2>
            <p className="font-body mt-8 text-base leading-relaxed text-muted-foreground">
              Fitzpatrick Capital Partners provides growth-stage companies with access to capital solutions
              beyond traditional venture funding. With deep experience in capital markets, structured finance,
              and strategic partnerships, we help companies scale efficiently while preserving ownership.
            </p>
          </motion.div>
          <div className="mt-16 grid gap-6 md:grid-cols-3">
            {[
              { title: "Founder-Led", desc: "Built by operators who understand the challenges of scaling a business while managing capital needs." },
              { title: "Capital Markets Expertise", desc: "Deep relationships across venture debt, private credit, and structured finance markets." },
              { title: "Strategic Network", desc: "Access to a curated network of lenders, strategic partners, and industry advisors." },
            ].map((item, i) => (
              <motion.div key={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i + 1}
                className="rounded-lg border border-border bg-card p-8"
              >
                <h3 className="font-display text-xl font-medium text-card-foreground">{item.title}</h3>
                <p className="font-body mt-3 text-sm leading-relaxed text-muted-foreground">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Deal Submission */}
      <section id="submit" className="bg-gradient-dark py-28">
        <div className="container mx-auto px-6">
          <div className="mx-auto max-w-3xl">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0} className="text-center">
              <p className="font-body mb-3 text-xs uppercase tracking-[0.2em] text-royal-light">Submit Opportunity</p>
              <h2 className="font-display text-4xl font-light text-primary-foreground md:text-5xl">
                Tell Us About Your <span className="text-gradient-royal font-medium">Company</span>
              </h2>
              <p className="font-body mt-4 text-sm text-primary-foreground/40">
                Confidential submissions reviewed within 48 hours.
              </p>
            </motion.div>

            {submitted ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-12 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-accent/10">
                  <Check className="h-8 w-8 text-accent" />
                </div>
                <h3 className="font-display mt-6 text-2xl text-primary-foreground">Submission Received</h3>
                <p className="font-body mt-3 text-sm text-primary-foreground/50">
                  Thank you. We'll review your submission and be in touch within 48 hours.
                  A confirmation has been sent to your email.
                </p>
              </motion.div>
            ) : (
              <motion.form
                initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={1}
                onSubmit={handleSubmit}
                className="mt-12 space-y-6"
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label className="font-body text-xs text-primary-foreground/50">Company Name *</Label>
                    <Input
                      required maxLength={100}
                      value={form.company_name}
                      onChange={e => setForm({ ...form, company_name: e.target.value })}
                      className="mt-1.5 border-primary-foreground/10 bg-primary-foreground/5 text-primary-foreground placeholder:text-primary-foreground/20"
                    />
                  </div>
                  <div>
                    <Label className="font-body text-xs text-primary-foreground/50">Industry *</Label>
                    <Input
                      required maxLength={100}
                      value={form.industry}
                      onChange={e => setForm({ ...form, industry: e.target.value })}
                      className="mt-1.5 border-primary-foreground/10 bg-primary-foreground/5 text-primary-foreground placeholder:text-primary-foreground/20"
                    />
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label className="font-body text-xs text-primary-foreground/50">Annual Revenue *</Label>
                    <Input
                      required maxLength={50}
                      placeholder="e.g. $10M"
                      value={form.annual_revenue}
                      onChange={e => setForm({ ...form, annual_revenue: e.target.value })}
                      className="mt-1.5 border-primary-foreground/10 bg-primary-foreground/5 text-primary-foreground placeholder:text-primary-foreground/20"
                    />
                  </div>
                  <div>
                    <Label className="font-body text-xs text-primary-foreground/50">Funding Needed *</Label>
                    <Input
                      required maxLength={50}
                      placeholder="e.g. $5M–$15M"
                      value={form.funding_needed}
                      onChange={e => setForm({ ...form, funding_needed: e.target.value })}
                      className="mt-1.5 border-primary-foreground/10 bg-primary-foreground/5 text-primary-foreground placeholder:text-primary-foreground/20"
                    />
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label className="font-body text-xs text-primary-foreground/50">Contact Name *</Label>
                    <Input
                      required maxLength={100}
                      value={form.contact_name}
                      onChange={e => setForm({ ...form, contact_name: e.target.value })}
                      className="mt-1.5 border-primary-foreground/10 bg-primary-foreground/5 text-primary-foreground placeholder:text-primary-foreground/20"
                    />
                  </div>
                  <div>
                    <Label className="font-body text-xs text-primary-foreground/50">Contact Email *</Label>
                    <Input
                      type="email" required maxLength={255}
                      value={form.contact_email}
                      onChange={e => setForm({ ...form, contact_email: e.target.value })}
                      className="mt-1.5 border-primary-foreground/10 bg-primary-foreground/5 text-primary-foreground placeholder:text-primary-foreground/20"
                    />
                  </div>
                </div>
                <div>
                  <Label className="font-body text-xs text-primary-foreground/50">Phone</Label>
                  <Input
                    maxLength={30}
                    value={form.contact_phone}
                    onChange={e => setForm({ ...form, contact_phone: e.target.value })}
                    className="mt-1.5 border-primary-foreground/10 bg-primary-foreground/5 text-primary-foreground placeholder:text-primary-foreground/20"
                  />
                </div>
                <div>
                  <Label className="font-body text-xs text-primary-foreground/50">Additional Notes</Label>
                  <Textarea
                    maxLength={2000} rows={4}
                    value={form.notes}
                    onChange={e => setForm({ ...form, notes: e.target.value })}
                    className="mt-1.5 border-primary-foreground/10 bg-primary-foreground/5 text-primary-foreground placeholder:text-primary-foreground/20"
                  />
                </div>
                <div>
                  <Label className="font-body text-xs text-primary-foreground/50">Upload Pitch Deck</Label>
                  <label className="mt-1.5 flex cursor-pointer items-center gap-3 rounded-md border border-primary-foreground/10 bg-primary-foreground/5 px-4 py-3 transition-colors hover:border-primary-foreground/20">
                    <Upload className="h-4 w-4 text-primary-foreground/30" />
                    <span className="font-body text-sm text-primary-foreground/50">
                      {pitchFile ? pitchFile.name : "PDF, PPTX, DOCX (max 20MB)"}
                    </span>
                    <input
                      type="file"
                      className="hidden"
                      accept=".pdf,.pptx,.ppt,.docx"
                      onChange={e => setPitchFile(e.target.files?.[0] || null)}
                    />
                  </label>
                </div>
                <Button
                  type="submit"
                  disabled={submitting}
                  size="lg"
                  className="w-full bg-gradient-royal font-body text-sm text-accent-foreground hover:opacity-90"
                >
                  {submitting ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...</>
                  ) : (
                    <>Submit Opportunity <ArrowRight className="ml-2 h-4 w-4" /></>
                  )}
                </Button>
                <p className="font-body text-center text-[11px] text-primary-foreground/25">
                  All submissions are confidential. We respond within 48 business hours.
                </p>
              </motion.form>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12">
        <div className="container mx-auto px-6">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <div className="flex items-center gap-3">
              <div className="h-6 w-6 rounded-sm bg-gradient-royal" />
              <span className="font-display text-sm font-semibold text-foreground">Fitzpatrick Capital Partners</span>
            </div>
            <div className="flex items-center gap-6">
              <a href="#approach" className="font-body text-xs text-muted-foreground transition-colors hover:text-foreground">Approach</a>
              <a href="#solutions" className="font-body text-xs text-muted-foreground transition-colors hover:text-foreground">Solutions</a>
              <a href="#about" className="font-body text-xs text-muted-foreground transition-colors hover:text-foreground">About</a>
              <a href="#submit" className="font-body text-xs text-muted-foreground transition-colors hover:text-foreground">Submit Deal</a>
              <Link to="/login" className="font-body text-xs text-muted-foreground transition-colors hover:text-foreground">Investor Login</Link>
            </div>
            <p className="font-body text-[11px] text-muted-foreground/50">
              © {new Date().getFullYear()} Fitzpatrick Capital Partners. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
