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
    <div className="flex flex-1 flex-col">
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2 text-lg font-semibold">
            <QrCode className="h-6 w-6" />
            <span>VRS</span>
          </div>
          <nav className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-muted-foreground hover:text-foreground text-sm font-medium"
            >
              Sign In
            </Link>
            <Link
              href="/login"
              className="bg-foreground text-background hover:bg-foreground/90 inline-flex h-9 items-center justify-center rounded-md px-4 text-sm font-medium"
            >
              Sign In
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="container mx-auto px-4 py-24 text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Visitor Registration, <span className="text-muted-foreground">Simplified</span>
          </h1>
          <p className="text-muted-foreground mx-auto mt-4 max-w-2xl text-lg">
            Replace paper visitor logs with QR-based digital registration. Secure, fast, and built
            for condos, apartments, offices, and warehouses.
          </p>
          <div className="mt-8 flex items-center justify-center gap-4">
            <Link
              href="/login"
              className="bg-foreground text-background hover:bg-foreground/90 inline-flex h-10 items-center justify-center rounded-md px-6 text-sm font-medium"
            >
              Sign In
            </Link>
          </div>
        </section>

        <section className="container mx-auto px-4 pb-24">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f) => (
              <div key={f.title} className="rounded-lg border p-6 text-left">
                <f.icon className="text-muted-foreground mb-3 h-8 w-8" />
                <h3 className="font-semibold">{f.title}</h3>
                <p className="text-muted-foreground mt-1 text-sm">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="text-muted-foreground border-t py-6 text-center text-sm">
        Visitor Registration System
      </footer>
    </div>
  );
}
