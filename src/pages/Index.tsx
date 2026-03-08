import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowRight, Shield, TrendingUp, Users, Building2, BarChart3, Briefcase, Mail, Phone, MapPin } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.15, duration: 0.6, ease: "easeOut" as const },
  }),
};

const Index = () => {
  const [contactForm, setContactForm] = useState({ name: "", email: "", message: "" });
  const { toast } = useToast();

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({ title: "Message sent", description: "We'll be in touch shortly." });
    setContactForm({ name: "", email: "", message: "" });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto flex h-20 items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded bg-gradient-gold" />
            <div>
              <h2 className="font-display text-xl font-semibold tracking-tight text-foreground">Fitzpatrick</h2>
              <p className="font-body text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Capital Partners</p>
            </div>
          </div>
          <div className="hidden items-center gap-8 md:flex">
            <a href="#about" className="font-body text-sm text-muted-foreground transition-colors hover:text-foreground">About</a>
            <a href="#strategy" className="font-body text-sm text-muted-foreground transition-colors hover:text-foreground">Strategy</a>
            <a href="#team" className="font-body text-sm text-muted-foreground transition-colors hover:text-foreground">Team</a>
            <a href="#track-record" className="font-body text-sm text-muted-foreground transition-colors hover:text-foreground">Track Record</a>
            <a href="#contact" className="font-body text-sm text-muted-foreground transition-colors hover:text-foreground">Contact</a>
            <Link to="/login">
              <Button variant="outline" size="sm" className="border-accent text-accent hover:bg-accent hover:text-accent-foreground">
                Investor Login
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-navy pt-20">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute left-1/4 top-1/4 h-96 w-96 rounded-full bg-accent/20 blur-[120px]" />
          <div className="absolute bottom-1/4 right-1/4 h-64 w-64 rounded-full bg-accent/10 blur-[100px]" />
        </div>
        <div className="container relative z-10 mx-auto px-6 text-center">
          <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
            <p className="font-body mb-6 text-sm uppercase tracking-[0.3em] text-maroon-light">Private Equity</p>
          </motion.div>
          <motion.h1
            initial="hidden" animate="visible" variants={fadeUp} custom={1}
            className="font-display mx-auto max-w-4xl text-5xl font-light leading-tight text-primary-foreground md:text-7xl lg:text-8xl"
          >
            Building Enduring{" "}
            <span className="text-gradient-gold font-medium">Value</span>
          </motion.h1>
          <motion.p
            initial="hidden" animate="visible" variants={fadeUp} custom={2}
            className="font-body mx-auto mt-8 max-w-2xl text-lg text-primary-foreground/60 md:text-xl"
          >
            Fitzpatrick Capital Partners is a private equity firm focused on acquiring and growing
            exceptional middle-market businesses across North America.
          </motion.p>
          <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={3} className="mt-12 flex items-center justify-center gap-4">
            <a href="#about">
              <Button size="lg" className="bg-gradient-gold font-body text-accent-foreground hover:opacity-90">
                Learn More <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </a>
            <Link to="/login">
              <Button size="lg" variant="outline" className="border-primary-foreground/20 font-body text-primary-foreground hover:bg-primary-foreground/10">
                Investor Portal
              </Button>
            </Link>
          </motion.div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
      </section>

      {/* About */}
      <section id="about" className="py-32">
        <div className="container mx-auto px-6">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0} className="mx-auto max-w-3xl text-center">
            <p className="font-body mb-4 text-sm uppercase tracking-[0.2em] text-accent">About Us</p>
            <h2 className="font-display text-4xl font-light text-foreground md:text-5xl">A Partnership Built on <span className="text-gradient-gold font-medium">Integrity</span></h2>
            <p className="font-body mt-8 text-lg leading-relaxed text-muted-foreground">
              Founded with a commitment to disciplined investing and operational excellence, Fitzpatrick Capital Partners
              seeks to create lasting value for our investors and portfolio companies. We bring decades of combined experience
              in private equity, operations, and strategic growth to every investment we make.
            </p>
          </motion.div>
          <div className="mt-20 grid gap-8 md:grid-cols-3">
            {[
              { icon: Shield, title: "Disciplined Approach", desc: "Rigorous due diligence and conservative underwriting guide every investment decision." },
              { icon: TrendingUp, title: "Operational Value", desc: "Hands-on partnership with management teams to accelerate growth and improve efficiency." },
              { icon: Users, title: "Aligned Interests", desc: "Significant personal capital invested alongside our limited partners in every fund." },
            ].map((item, i) => (
              <motion.div key={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i + 1}
                className="group rounded-xl border border-border bg-card p-8 transition-all hover:border-accent/30 hover:shadow-lg hover:shadow-accent/5">
                <item.icon className="h-8 w-8 text-accent" />
                <h3 className="font-display mt-6 text-2xl font-medium text-card-foreground">{item.title}</h3>
                <p className="font-body mt-3 text-sm leading-relaxed text-muted-foreground">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Strategy */}
      <section id="strategy" className="bg-gradient-navy py-32">
        <div className="container mx-auto px-6">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0} className="mx-auto max-w-3xl text-center">
            <p className="font-body mb-4 text-sm uppercase tracking-[0.2em] text-maroon-light">Investment Strategy</p>
            <h2 className="font-display text-4xl font-light text-primary-foreground md:text-5xl">Focused on the <span className="text-gradient-gold font-medium">Middle Market</span></h2>
          </motion.div>
          <div className="mt-20 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: Building2, title: "Industrials", desc: "Manufacturing, distribution, and industrial services" },
              { icon: Briefcase, title: "Business Services", desc: "Technology-enabled services and outsourced solutions" },
              { icon: BarChart3, title: "Healthcare", desc: "Healthcare services and health IT platforms" },
              { icon: TrendingUp, title: "Consumer", desc: "Branded consumer products and specialty retail" },
            ].map((item, i) => (
              <motion.div key={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i + 1}
                className="rounded-xl border border-primary-foreground/10 bg-primary-foreground/5 p-8 backdrop-blur-sm">
                <item.icon className="h-8 w-8 text-maroon" />
                <h3 className="font-display mt-6 text-xl font-medium text-primary-foreground">{item.title}</h3>
                <p className="font-body mt-3 text-sm text-primary-foreground/50">{item.desc}</p>
              </motion.div>
            ))}
          </div>
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={5} className="mx-auto mt-16 max-w-2xl">
            <div className="grid grid-cols-2 gap-8 rounded-xl border border-primary-foreground/10 bg-primary-foreground/5 p-8 text-center">
              <div>
                <p className="font-display text-3xl font-semibold text-maroon">$25M – $150M</p>
                <p className="font-body mt-2 text-sm text-primary-foreground/50">Enterprise Value</p>
              </div>
              <div>
                <p className="font-display text-3xl font-semibold text-maroon">$10M – $75M</p>
                <p className="font-body mt-2 text-sm text-primary-foreground/50">Equity Investment</p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Team */}
      <section id="team" className="py-32">
        <div className="container mx-auto px-6">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0} className="mx-auto max-w-3xl text-center">
            <p className="font-body mb-4 text-sm uppercase tracking-[0.2em] text-accent">Our Team</p>
            <h2 className="font-display text-4xl font-light text-foreground md:text-5xl">Experienced <span className="text-gradient-gold font-medium">Leadership</span></h2>
          </motion.div>
          <div className="mt-20 grid gap-8 md:grid-cols-3">
            {[
              { name: "James Fitzpatrick", title: "Managing Partner", bio: "25+ years in private equity and investment banking. Previously led middle-market transactions at a top-tier PE firm." },
              { name: "Sarah Mitchell", title: "Partner", bio: "Former management consultant and operating executive with deep expertise in industrial and business services sectors." },
              { name: "David Chen", title: "Principal", bio: "Experienced investor with a background in healthcare services and technology-enabled business models." },
            ].map((member, i) => (
              <motion.div key={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i + 1}
                className="group rounded-xl border border-border bg-card p-8 text-center transition-all hover:border-accent/30">
                <div className="mx-auto h-24 w-24 rounded-full bg-gradient-gold opacity-80" />
                <h3 className="font-display mt-6 text-2xl font-medium text-card-foreground">{member.name}</h3>
                <p className="font-body mt-1 text-sm font-medium text-accent">{member.title}</p>
                <p className="font-body mt-4 text-sm leading-relaxed text-muted-foreground">{member.bio}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Track Record */}
      <section id="track-record" className="bg-gradient-navy py-32">
        <div className="container mx-auto px-6">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0} className="mx-auto max-w-3xl text-center">
            <p className="font-body mb-4 text-sm uppercase tracking-[0.2em] text-gold-light">Track Record</p>
            <h2 className="font-display text-4xl font-light text-primary-foreground md:text-5xl">Proven <span className="text-gradient-gold font-medium">Results</span></h2>
          </motion.div>
          <div className="mt-20 grid gap-8 md:grid-cols-4">
            {[
              { value: "$2.1B+", label: "Capital Deployed" },
              { value: "34", label: "Portfolio Companies" },
              { value: "2.8x", label: "Average MOIC" },
              { value: "28%", label: "Gross IRR" },
            ].map((stat, i) => (
              <motion.div key={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i + 1}
                className="rounded-xl border border-primary-foreground/10 bg-primary-foreground/5 p-8 text-center">
                <p className="font-display text-4xl font-semibold text-gold md:text-5xl">{stat.value}</p>
                <p className="font-body mt-3 text-sm text-primary-foreground/50">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="py-32">
        <div className="container mx-auto px-6">
          <div className="mx-auto max-w-5xl">
            <div className="grid gap-16 md:grid-cols-2">
              <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
                <p className="font-body mb-4 text-sm uppercase tracking-[0.2em] text-accent">Contact</p>
                <h2 className="font-display text-4xl font-light text-foreground md:text-5xl">Get in <span className="text-gradient-gold font-medium">Touch</span></h2>
                <p className="font-body mt-6 text-muted-foreground">
                  Interested in learning more about Fitzpatrick Capital Partners? We welcome inquiries
                  from prospective investors, management teams, and intermediaries.
                </p>
                <div className="mt-10 space-y-6">
                  <div className="flex items-center gap-4">
                    <Mail className="h-5 w-5 text-accent" />
                    <span className="font-body text-sm text-muted-foreground">info@fitzpatrickcapital.com</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <Phone className="h-5 w-5 text-accent" />
                    <span className="font-body text-sm text-muted-foreground">(212) 555-0180</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <MapPin className="h-5 w-5 text-accent" />
                    <span className="font-body text-sm text-muted-foreground">New York, NY</span>
                  </div>
                </div>
              </motion.div>
              <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={1}>
                <form onSubmit={handleContactSubmit} className="space-y-6">
                  <div>
                    <label className="font-body text-sm font-medium text-foreground">Name</label>
                    <Input
                      value={contactForm.name}
                      onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                      required maxLength={100}
                      className="mt-2 border-border bg-card"
                    />
                  </div>
                  <div>
                    <label className="font-body text-sm font-medium text-foreground">Email</label>
                    <Input
                      type="email"
                      value={contactForm.email}
                      onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                      required maxLength={255}
                      className="mt-2 border-border bg-card"
                    />
                  </div>
                  <div>
                    <label className="font-body text-sm font-medium text-foreground">Message</label>
                    <Textarea
                      value={contactForm.message}
                      onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                      required maxLength={1000} rows={5}
                      className="mt-2 border-border bg-card"
                    />
                  </div>
                  <Button type="submit" className="w-full bg-gradient-gold font-body text-accent-foreground hover:opacity-90">
                    Send Message
                  </Button>
                </form>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card py-16">
        <div className="container mx-auto px-6">
          <div className="flex flex-col items-center justify-between gap-8 md:flex-row">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded bg-gradient-gold" />
              <div>
                <h3 className="font-display text-lg font-semibold text-card-foreground">Fitzpatrick Capital Partners</h3>
              </div>
            </div>
            <div className="flex items-center gap-8">
              <a href="#about" className="font-body text-xs text-muted-foreground transition-colors hover:text-foreground">About</a>
              <a href="#strategy" className="font-body text-xs text-muted-foreground transition-colors hover:text-foreground">Strategy</a>
              <a href="#team" className="font-body text-xs text-muted-foreground transition-colors hover:text-foreground">Team</a>
              <a href="#contact" className="font-body text-xs text-muted-foreground transition-colors hover:text-foreground">Contact</a>
              <Link to="/login" className="font-body text-xs text-accent transition-colors hover:text-accent/80">Investor Login</Link>
            </div>
          </div>
          <div className="mt-10 border-t border-border pt-8 text-center">
            <p className="font-body text-xs text-muted-foreground">
              © {new Date().getFullYear()} Fitzpatrick Capital Partners. All rights reserved.
              This website does not constitute an offer to sell or a solicitation of an offer to buy any securities.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
