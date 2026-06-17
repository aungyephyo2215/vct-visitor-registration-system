"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Users,
  CalendarClock,
  Clock,
  BarChart3,
  Mail,
  FileText,
  Plus,
  ArrowRight,
} from "lucide-react";
import { api } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

interface Visit {
  id: string;
  status: string;
  visitor: { name: string };
  unit: { unit_no: string; floor: number };
  purpose: string;
  checkin_time: string | null;
  created_at: string;
}

interface PaginatedResult<T> {
  data: T[];
  total: number;
}

const statsCards = [
  {
    title: "Total Visitors",
    icon: Users,
    color: "text-blue-600",
    bg: "bg-blue-100 dark:bg-blue-900/20",
    query: "/api/v1/visitors",
    countField: "total" as const,
  },
  {
    title: "Active Visits",
    icon: Clock,
    color: "text-green-600",
    bg: "bg-green-100 dark:bg-green-900/20",
    query: "/api/v1/visits?status=CHECKED_IN",
    countField: "total" as const,
  },
  {
    title: "Expected Today",
    icon: CalendarClock,
    color: "text-orange-600",
    bg: "bg-orange-100 dark:bg-orange-900/20",
    query: "/api/v1/visits?status=EXPECTED",
    countField: "total" as const,
  },
  {
    title: "All Visits",
    icon: BarChart3,
    color: "text-purple-600",
    bg: "bg-purple-100 dark:bg-purple-900/20",
    query: "/api/v1/visits",
    countField: "total" as const,
  },
  {
    title: "Pending Invitations",
    icon: Mail,
    color: "text-amber-600",
    bg: "bg-amber-100 dark:bg-amber-900/20",
    query: "/api/v1/invitations?status=PENDING",
    countField: "total" as const,
  },
  {
    title: "Awaiting Approval",
    icon: FileText,
    color: "text-rose-600",
    bg: "bg-rose-100 dark:bg-rose-900/20",
    query: "/api/v1/invitations?status=PENDING",
    countField: "total" as const,
  },
];

export default function DashboardPage() {
  const [stats, setStats] = useState<Record<string, number>>({});
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const results = await Promise.all(
          statsCards.map((card) => api.get<PaginatedResult<unknown>>(card.query)),
        );
        const statMap: Record<string, number> = {};
        statsCards.forEach((card, i) => {
          statMap[card.title] = results[i].total;
        });
        setStats(statMap);

        const recentVisits = await api.get<PaginatedResult<Visit>>("/api/v1/visits?limit=5");
        setVisits(recentVisits.data);
      } catch {
        toast.error("Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your property activity</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {statsCards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-muted-foreground text-sm font-medium">
                {card.title}
              </CardTitle>
              <div className={`rounded-lg p-2 ${card.bg}`}>
                <card.icon className={`h-4 w-4 ${card.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <div className="text-2xl font-bold">{stats[card.title] ?? 0}</div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Recent Visits</CardTitle>
            <Link href="/visits">
              <Button variant="outline" size="sm">
                View All
                <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : visits.length === 0 ? (
              <p className="text-muted-foreground text-sm">No visits yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-muted-foreground border-b text-left">
                      <th className="pb-2 font-medium">Visitor</th>
                      <th className="pb-2 font-medium">Unit</th>
                      <th className="pb-2 font-medium">Purpose</th>
                      <th className="pb-2 font-medium">Status</th>
                      <th className="pb-2 font-medium">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visits.map((v) => (
                      <tr key={v.id} className="border-b last:border-0">
                        <td className="py-2">{v.visitor?.name || "—"}</td>
                        <td className="py-2">
                          {v.unit?.unit_no || "—"}
                          {v.unit?.floor ? ` (F${v.unit.floor})` : ""}
                        </td>
                        <td className="py-2">{v.purpose?.replace(/_/g, " ")}</td>
                        <td className="py-2">
                          <StatusBadge status={v.status} />
                        </td>
                        <td className="text-muted-foreground py-2">
                          {v.checkin_time
                            ? new Date(v.checkin_time).toLocaleTimeString()
                            : v.created_at
                              ? new Date(v.created_at).toLocaleDateString()
                              : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/visitors/new">
              <Button className="w-full justify-start" variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                New Visitor
              </Button>
            </Link>
            <Link href="/visits/new">
              <Button className="w-full justify-start" variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                Create Visit
              </Button>
            </Link>
            <Link href="/invitations/new">
              <Button className="w-full justify-start" variant="outline">
                <Mail className="mr-2 h-4 w-4" />
                New Invitation
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
