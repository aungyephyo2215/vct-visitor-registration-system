"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";
import { toast } from "sonner";

interface Visitor {
  id: string;
  name: string;
  phone: string;
}

interface Unit {
  id: string;
  unit_no: string;
  floor: number;
}

interface User {
  id: string;
  name: string;
  email: string;
}

interface PaginatedResult<T> {
  data: T[];
}

const purposes = [
  { value: "FAMILY_VISIT", label: "Family Visit" },
  { value: "BUSINESS_MEETING", label: "Business Meeting" },
  { value: "DELIVERY", label: "Delivery" },
  { value: "MAINTENANCE", label: "Maintenance" },
  { value: "INTERVIEW", label: "Interview" },
  { value: "CONTRACTOR", label: "Contractor" },
  { value: "OTHER", label: "Other" },
];

export default function NewVisitPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [hosts, setHosts] = useState<User[]>([]);
  const [form, setForm] = useState({
    visitor_id: "",
    unit_id: "",
    host_user_id: "",
    purpose: "FAMILY_VISIT",
    notes: "",
    vehicle_number: "",
  });
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const [vResult, uResult, hResult] = await Promise.all([
          api.get<PaginatedResult<Visitor>>("/api/v1/visitors?limit=100"),
          api.get<PaginatedResult<Unit>>("/api/v1/units?limit=100").catch(() => ({ data: [] })),
          api
            .get<PaginatedResult<User>>("/api/v1/users?limit=100&role=RESIDENT,PROPERTY_ADMIN")
            .catch(() => ({ data: [] })),
        ]);
        setVisitors(vResult.data);
        setUnits(uResult.data);
        setHosts(hResult.data);
      } catch {
        // visitors endpoint works, units/users may fail
      }
    }
    load();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!form.visitor_id || !form.unit_id) {
      setError("Visitor and unit are required");
      return;
    }

    setLoading(true);
    try {
      await api.post("/api/v1/visits", {
        ...form,
        host_user_id: form.host_user_id || undefined,
        notes: form.notes || undefined,
        vehicle_number: form.vehicle_number || undefined,
      });
      toast.success("Visit created");
      router.push("/visits");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create visit");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/visits">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Create Visit</h1>
          <p className="text-muted-foreground">Schedule a new visitor check-in</p>
        </div>
      </div>

      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>Visit Details</CardTitle>
          <CardDescription>Select visitor and destination</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="visitor">Visitor *</Label>
              <Select
                value={form.visitor_id}
                onValueChange={(v) => setForm({ ...form, visitor_id: v || form.visitor_id })}
                disabled={loading}
              >
                <SelectTrigger id="visitor">
                  <SelectValue placeholder="Select a visitor" />
                </SelectTrigger>
                <SelectContent>
                  {visitors.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.name} ({v.phone})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="unit">Unit *</Label>
              <Select
                value={form.unit_id}
                onValueChange={(v) => setForm({ ...form, unit_id: v || form.unit_id })}
                disabled={loading}
              >
                <SelectTrigger id="unit">
                  <SelectValue placeholder="Select a unit" />
                </SelectTrigger>
                <SelectContent>
                  {units.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      Unit {u.unit_no} (Floor {u.floor})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="host">Host (Optional)</Label>
              <Select
                value={form.host_user_id}
                onValueChange={(v) => setForm({ ...form, host_user_id: v || form.host_user_id })}
                disabled={loading}
              >
                <SelectTrigger id="host">
                  <SelectValue placeholder="Select a host" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No host</SelectItem>
                  {hosts.map((h) => (
                    <SelectItem key={h.id} value={h.id}>
                      {h.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="purpose">Purpose *</Label>
              <Select
                value={form.purpose}
                onValueChange={(v) => setForm({ ...form, purpose: v || form.purpose })}
                disabled={loading}
              >
                <SelectTrigger id="purpose">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {purposes.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="vehicle">Vehicle Number</Label>
              <Input
                id="vehicle"
                value={form.vehicle_number}
                onChange={(e) => setForm({ ...form, vehicle_number: e.target.value })}
                placeholder="ABC-123"
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Any special instructions..."
                disabled={loading}
                rows={3}
              />
            </div>

            {error && (
              <div className="bg-destructive/10 text-destructive rounded-md px-3 py-2 text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <Link href="/visits">
                <Button type="button" variant="outline" disabled={loading}>
                  Cancel
                </Button>
              </Link>
              <Button type="submit" disabled={loading}>
                {loading ? "Creating..." : "Create Visit"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
