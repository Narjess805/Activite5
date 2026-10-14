import {
  ArrowRight,
  BookOpen,
  Brain,
  ChartSpline,
  Compass,
  GraduationCap,
  LayoutDashboard,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const experiencePillars = [
  {
    title: "Premium learner journey",
    description: "A cleaner browse-to-enroll flow with stronger hierarchy and richer course storytelling.",
    icon: Compass,
  },
  {
    title: "AI kept in context",
    description: "The tutor, quiz generation, and recommendations feel embedded in the product instead of bolted on.",
    icon: Brain,
  },
  {
    title: "Ops-ready dashboards",
    description: "Student, instructor, and admin views now feel like one designed platform with shared UX patterns.",
    icon: LayoutDashboard,
  },
];

const roleShowcase = [
  {
    title: "For learners",
    description: "Sharper catalog browsing, stronger lesson pacing, and progress views that feel motivating instead of mechanical.",
    icon: BookOpen,
  },
  {
    title: "For instructors",
    description: "Course creation and lesson management now read like a polished studio with clearer editing surfaces.",
    icon: GraduationCap,
  },
  {
    title: "For admins",
    description: "Analytics, platform oversight, and activity monitoring fit inside a calmer command center.",
    icon: ShieldCheck,
  },
];

export default function Home() {
  return (
    <div className="space-y-10">
      <section className="app-shell">
        <div className="hero-shell soft-grid px-6 py-10 sm:px-8 lg:px-12 lg:py-14">
          <div className="absolute inset-x-0 top-0 h-44 bg-[radial-gradient(circle_at_top,hsl(var(--primary)/0.16),transparent_68%)]" />
          <div className="absolute right-[-4rem] top-[-4rem] h-52 w-52 rounded-full bg-[radial-gradient(circle,hsl(var(--accent)/0.22),transparent_72%)] blur-3xl" />
          <div className="absolute bottom-[-5rem] left-[-2rem] h-52 w-52 rounded-full bg-[radial-gradient(circle,hsl(var(--secondary-foreground)/0.12),transparent_72%)] blur-3xl" />

          <div className="relative grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
            <div className="max-w-3xl">
              <Badge variant="secondary" className="animate-fade-in">
                <Sparkles className="h-3.5 w-3.5 text-accent" />
                Resale-ready redesign
              </Badge>
              <h1 className="mt-6 font-display text-5xl leading-[0.9] text-foreground sm:text-6xl lg:text-7xl animate-fade-in-up">
                A learning platform that finally looks like a product people want to buy.
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-8 text-muted-foreground animate-fade-in-up stagger-2 sm:text-lg">
                Lunexa Academy now presents courses, AI support, dashboards, and management flows through a warmer, more luxurious product identity built to feel distinct, premium, and commercially credible.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row animate-fade-in-up stagger-3">
                <Button size="lg" asChild>
                  <a href="/courses">
                    Explore the catalog
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </a>
                </Button>
                <Button variant="outline" size="lg" asChild>
                  <a href="/dashboard">Open the dashboard</a>
                </Button>
              </div>

              <div className="mt-8 flex flex-wrap gap-3">
                <span className="stat-chip">
                  <Users className="h-3.5 w-3.5 text-primary" />
                  10K+ learners supported
                </span>
                <span className="stat-chip">
                  <ChartSpline className="h-3.5 w-3.5 text-primary" />
                  Analytics and admin views included
                </span>
                <span className="stat-chip">
                  <Brain className="h-3.5 w-3.5 text-accent" />
                  AI tutor and lesson quiz flow
                </span>
              </div>
            </div>

            <div className="grid gap-4 lg:pl-6">
              <div className="spotlight-panel animate-fade-in-up stagger-2">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/65">What changed</p>
                <h2 className="mt-4 font-display text-4xl leading-[0.92] text-white">
                  New brand energy without changing the platform foundation.
                </h2>
                <p className="mt-4 max-w-md text-sm leading-7 text-white/74">
                  This version leans into boutique typography, richer earth-toned color, a custom logo mark, and more buyer-friendly product framing across every major screen.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Card className="bg-white/75 animate-fade-in-up stagger-3">
                  <CardContent className="p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Navigation</p>
                    <p className="mt-3 text-2xl font-semibold text-foreground">More confident</p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      Clearer routes between catalog, lessons, dashboards, and profile settings.
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-white/75 animate-fade-in-up stagger-4">
                  <CardContent className="p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Presentation</p>
                    <p className="mt-3 text-2xl font-semibold text-foreground">More premium</p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      Better contrast, cleaner forms, and polished data panels across roles.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="app-shell">
        <div className="data-grid">
          {experiencePillars.map((pillar, index) => (
            <Card
              key={pillar.title}
              className={`group overflow-hidden bg-white/80 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_34px_80px_-52px_rgba(15,48,80,0.42)] animate-fade-in-up ${["stagger-1", "stagger-2", "stagger-3"][index]}`}
            >
              <CardContent className="p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-[1.2rem] bg-[linear-gradient(135deg,hsl(var(--secondary)),hsl(var(--card)))] text-primary shadow-[0_18px_40px_-28px_rgba(15,48,80,0.3)]">
                  <pillar.icon className="h-6 w-6" />
                </div>
                <h3 className="mt-5 text-2xl font-semibold text-foreground">{pillar.title}</h3>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">{pillar.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="app-shell">
        <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="section-panel p-8 sm:p-10">
            <p className="eyebrow">Why it sells better</p>
            <h2 className="mt-5 max-w-lg font-display text-4xl leading-[0.92] text-foreground sm:text-5xl">
              The platform now looks cohesive at the product level, not just the page level.
            </h2>
            <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground">
              Buyer confidence often comes from the details: how polished the dashboard feels, whether forms look trustworthy, and whether every role has a UI that feels intentionally designed. This refresh pushes the whole app in that direction.
            </p>

            <div className="mt-8 data-grid">
              {[
                { label: "Visual system", value: "Unified" },
                { label: "Role coverage", value: "3 views" },
                { label: "AI surfaces", value: "Integrated" },
                { label: "Perception", value: "Premium" },
              ].map((stat) => (
                <div key={stat.label} className="metric-tile">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">{stat.label}</p>
                  <p className="mt-3 text-3xl font-semibold text-foreground">{stat.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {roleShowcase.map((item, index) => (
              <Card
                key={item.title}
                className={`bg-white/80 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_34px_80px_-52px_rgba(15,48,80,0.42)] animate-fade-in-up ${["stagger-1", "stagger-2", "stagger-3"][index] || "stagger-3"}`}
              >
                <CardContent className="p-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-[1.2rem] bg-[linear-gradient(135deg,hsl(var(--foreground)),hsl(var(--primary)))] text-primary-foreground">
                    <item.icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-5 text-2xl font-semibold text-foreground">{item.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">{item.description}</p>
                </CardContent>
              </Card>
            ))}
            <Card className="bg-[linear-gradient(145deg,hsl(var(--secondary)),hsl(var(--card)))] sm:col-span-2">
              <CardContent className="flex h-full flex-col justify-between gap-5 p-6 sm:flex-row sm:items-end">
                <div>
                  <p className="eyebrow">Built for demos</p>
                  <h3 className="mt-5 font-display text-3xl leading-[0.94] text-foreground sm:text-4xl">
                    Home, catalog, lessons, profile, instructor tools, and admin control all look like they belong together.
                  </h3>
                </div>
                <Button asChild>
                  <a href="/auth/register">
                    Create demo account
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </a>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}
