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
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";
import { toast } from "sonner";

interface Unit {
  id: string;
  unit_no: string;
  floor: number;
}

interface PaginatedResult<T> {
  data: T[];
}

const visitorTypes = [
  { value: "GUEST", label: "Guest" },
  { value: "FAMILY", label: "Family" },
  { value: "VIP", label: "VIP" },
  { value: "VENDOR", label: "Vendor" },
  { value: "CONTRACTOR", label: "Contractor" },
  { value: "DELIVERY", label: "Delivery" },
  { value: "AUDITOR", label: "Auditor" },
  { value: "GOVERNMENT", label: "Government" },
];

const idTypes = [
  { value: "NRC", label: "NRC" },
  { value: "PASSPORT", label: "Passport" },
  { value: "DRIVING_LICENSE", label: "Driving License" },
  { value: "COMPANY_ID", label: "Company ID" },
  { value: "OTHER", label: "Other" },
];

export default function NewInvitationPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [units, setUnits] = useState<Unit[]>([]);
  const [form, setForm] = useState({
    visitor_name: "",
    visitor_phone: "",
    visitor_email: "",
    visitor_id_type: "",
    visitor_id_number: "",
    visitor_type: "GUEST",
    unit_id: "",
    expected_date: "",
    expected_time: "",
    notes: "",
  });
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const uResult = await api.get<PaginatedResult<Unit>>("/api/v1/units?limit=100");
        setUnits(uResult.data);
      } catch {
        // units may fail silently
      }
    }
    load();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!form.visitor_name || !form.visitor_phone || !form.unit_id || !form.expected_date) {
      setError("Visitor name, phone, unit, and expected date are required");
      return;
    }

    setLoading(true);
    try {
      await api.post("/api/v1/invitations", {
        ...form,
        visitor_email: form.visitor_email || undefined,
        visitor_id_type: form.visitor_id_type || undefined,
        visitor_id_number: form.visitor_id_number || undefined,
        expected_time: form.expected_time || undefined,
        notes: form.notes || undefined,
      });
      toast.success("Invitation created");
      router.push("/invitations");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create invitation");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/invitations">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">New Invitation</h1>
          <p className="text-muted-foreground">
            Pre-register a visitor
          </p>
        </div>
      </div>

      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>Invitation Details</CardTitle>
          <CardDescription>
            Enter the visitor&apos;s information and visit details
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="visitor_name">Visitor Name *</Label>
              <Input
                id="visitor_name"
                value={form.visitor_name}
                onChange={(e) => setForm({ ...form, visitor_name: e.target.value })}
                placeholder="John Doe"
                disabled={loading}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="visitor_phone">Phone *</Label>
              <Input
                id="visitor_phone"
                value={form.visitor_phone}
                onChange={(e) => setForm({ ...form, visitor_phone: e.target.value })}
                placeholder="+95912345678"
                disabled={loading}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="visitor_email">Email</Label>
              <Input
                id="visitor_email"
                type="email"
                value={form.visitor_email}
                onChange={(e) => setForm({ ...form, visitor_email: e.target.value })}
                placeholder="john@example.com"
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="visitor_type">Visitor Type *</Label>
              <Select
                value={form.visitor_type}
                onValueChange={(v) => setForm({ ...form, visitor_type: v || form.visitor_type })}
                disabled={loading}
              >
                <SelectTrigger id="visitor_type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {visitorTypes.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="id_type">ID Type</Label>
                <Select
                  value={form.visitor_id_type}
                  onValueChange={(v) => setForm({ ...form, visitor_id_type: v || "" })}
                  disabled={loading}
                >
                  <SelectTrigger id="id_type">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {idTypes.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="id_number">ID Number</Label>
                <Input
                  id="id_number"
                  value={form.visitor_id_number}
                  onChange={(e) => setForm({ ...form, visitor_id_number: e.target.value })}
                  placeholder="PA123456"
                  disabled={loading}
                />
              </div>
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="expected_date">Expected Date *</Label>
                <Input
                  id="expected_date"
                  type="date"
                  value={form.expected_date}
                  onChange={(e) => setForm({ ...form, expected_date: e.target.value })}
                  disabled={loading}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expected_time">Expected Time</Label>
                <Input
                  id="expected_time"
                  type="time"
                  value={form.expected_time}
                  onChange={(e) => setForm({ ...form, expected_time: e.target.value })}
                  disabled={loading}
                />
              </div>
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
              <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <Link href="/invitations">
                <Button type="button" variant="outline" disabled={loading}>
                  Cancel
                </Button>
              </Link>
              <Button type="submit" disabled={loading}>
                {loading ? "Creating..." : "Create Invitation"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
