import Link from "next/link";
import { Building2, QrCode, ShieldCheck, ClipboardCheck } from "lucide-react";

const features = [
  {
    icon: QrCode,
    title: "QR Check-In",
    desc: "Digital QR codes replace paper logs. Visitors check in with a scan.",
  },
  {
    icon: ShieldCheck,
    title: "Security Dashboard",
    desc: "Real-time visitor status, blocklist alerts, and audit trails.",
  },
  {
    icon: ClipboardCheck,
    title: "Visitor History",
    desc: "Full visit history with search, filters, and export.",
  },
  {
    icon: Building2,
    title: "Multi-Property",
    desc: "Manage condos, apartments, offices, and warehouses from one system.",
  },
];

export default function Home() {
  return (
    <div className="flex flex-col flex-1">
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2 font-semibold text-lg">
            <QrCode className="h-6 w-6" />
            <span>VRS</span>
          </div>
          <nav className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="inline-flex h-9 items-center justify-center rounded-md bg-foreground px-4 text-sm font-medium text-background hover:bg-foreground/90"
            >
              Get Started
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="container mx-auto px-4 py-24 text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Visitor Registration,{" "}
            <span className="text-muted-foreground">Simplified</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            Replace paper visitor logs with QR-based digital registration.
            Secure, fast, and built for condos, apartments, offices, and
            warehouses.
          </p>
          <div className="mt-8 flex items-center justify-center gap-4">
            <Link
              href="/register"
              className="inline-flex h-10 items-center justify-center rounded-md bg-foreground px-6 text-sm font-medium text-background hover:bg-foreground/90"
            >
              Get Started
            </Link>
            <Link
              href="/login"
              className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-6 text-sm font-medium hover:bg-accent"
            >
              Sign In
            </Link>
          </div>
        </section>

        <section className="container mx-auto px-4 pb-24">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f) => (
              <div
                key={f.title}
                className="rounded-lg border p-6 text-left"
              >
                <f.icon className="mb-3 h-8 w-8 text-muted-foreground" />
                <h3 className="font-semibold">{f.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        Visitor Registration System
      </footer>
    </div>
  );
}
