"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { api } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
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
import Link from "next/link";
import { toast } from "sonner";

const idTypes = [
  { value: "NRC", label: "NRC" },
  { value: "PASSPORT", label: "Passport" },
  { value: "DRIVING_LICENSE", label: "Driving License" },
  { value: "COMPANY_ID", label: "Company ID" },
  { value: "OTHER", label: "Other" },
];

export default function NewVisitorPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    id_type: "PASSPORT",
    id_number: "",
    photo_url: "",
  });
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!form.name || !form.phone || !form.id_number) {
      setError("Name, phone, and ID number are required");
      return;
    }

    setLoading(true);
    try {
      await api.post("/api/v1/visitors", {
        ...form,
        photo_url: form.photo_url || undefined,
      });
      toast.success("Visitor created");
      router.push("/visitors");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create visitor");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/visitors">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">New Visitor</h1>
          <p className="text-muted-foreground">
            Register a new visitor in the system
          </p>
        </div>
      </div>

      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>Visitor Details</CardTitle>
          <CardDescription>
            Enter the visitor&apos;s information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="John Doe"
                disabled={loading}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone *</Label>
              <Input
                id="phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+95912345678"
                disabled={loading}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="id_type">ID Type *</Label>
              <Select
                value={form.id_type}
                onValueChange={(v) => setForm({ ...form, id_type: v || form.id_type })}
                disabled={loading}
              >
                <SelectTrigger id="id_type">
                  <SelectValue />
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
              <Label htmlFor="id_number">ID Number *</Label>
              <Input
                id="id_number"
                value={form.id_number}
                onChange={(e) =>
                  setForm({ ...form, id_number: e.target.value })
                }
                placeholder="PA123456"
                disabled={loading}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="photo_url">Photo URL</Label>
              <Input
                id="photo_url"
                type="url"
                value={form.photo_url}
                onChange={(e) =>
                  setForm({ ...form, photo_url: e.target.value })
                }
                placeholder="https://example.com/photo.jpg"
                disabled={loading}
              />
            </div>
            {error && (
              <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}
            <div className="flex gap-3">
              <Link href="/visitors">
                <Button type="button" variant="outline" disabled={loading}>
                  Cancel
                </Button>
              </Link>
              <Button type="submit" disabled={loading}>
                {loading ? "Creating..." : "Create Visitor"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
