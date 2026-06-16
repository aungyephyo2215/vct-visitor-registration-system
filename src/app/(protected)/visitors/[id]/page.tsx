"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
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
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/confirm-dialog";

interface Visitor {
  id: string;
  name: string;
  phone: string;
  id_type: string;
  id_number: string;
  photo_url: string | null;
  property_id: string;
  created_at: string;
  updated_at: string;
}

const idTypes = [
  { value: "NRC", label: "NRC" },
  { value: "PASSPORT", label: "Passport" },
  { value: "DRIVING_LICENSE", label: "Driving License" },
  { value: "COMPANY_ID", label: "Company ID" },
  { value: "OTHER", label: "Other" },
];

export default function VisitorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [visitor, setVisitor] = useState<Visitor | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", id_type: "", id_number: "" });

  useEffect(() => {
    async function load() {
      try {
        const data = await api.get<Visitor>(`/api/v1/visitors/${id}`);
        setVisitor(data);
        setForm({
          name: data.name,
          phone: data.phone,
          id_type: data.id_type,
          id_number: data.id_number,
        });
      } catch {
        toast.error("Visitor not found");
        router.push("/visitors");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id, router]);

  async function handleSave() {
    setSaving(true);
    try {
      const updated = await api.patch<Visitor>(`/api/v1/visitors/${id}`, form);
      setVisitor(updated);
      setEditing(false);
      toast.success("Visitor updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    try {
      await api.del(`/api/v1/visitors/${id}`);
      toast.success("Visitor deleted");
      router.push("/visitors");
    } catch {
      toast.error("Failed to delete visitor");
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full max-w-lg" />
      </div>
    );
  }

  if (!visitor) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/visitors">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {editing ? "Edit Visitor" : visitor.name}
            </h1>
            <p className="text-muted-foreground">
              Visitor ID: {visitor.id.slice(0, 8)}...
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {!editing && (
            <>
              <Button
                variant="outline"
                onClick={() => setEditing(true)}
              >
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </Button>
              <Button
                variant="destructive"
                size="icon"
                onClick={() => setShowDelete(true)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>Visitor Details</CardTitle>
          <CardDescription>
            Registered {new Date(visitor.created_at).toLocaleDateString()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {editing ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input
                  value={form.name}
                  onChange={(e) =>
                    setForm({ ...form, name: e.target.value })
                  }
                  disabled={saving}
                />
              </div>
              <div className="space-y-2">
                <Label>Phone *</Label>
                <Input
                  value={form.phone}
                  onChange={(e) =>
                    setForm({ ...form, phone: e.target.value })
                  }
                  disabled={saving}
                />
              </div>
              <div className="space-y-2">
                <Label>ID Type</Label>
                <Select
                  value={form.id_type}
                  onValueChange={(v) =>
                    setForm({ ...form, id_type: v || form.id_type })
                  }
                  disabled={saving}
                >
                  <SelectTrigger>
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
                <Label>ID Number</Label>
                <Input
                  value={form.id_number}
                  onChange={(e) =>
                    setForm({ ...form, id_number: e.target.value })
                  }
                  disabled={saving}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditing(false);
                    setForm({
                      name: visitor.name,
                      phone: visitor.phone,
                      id_type: visitor.id_type,
                      id_number: visitor.id_number,
                    });
                  }}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>
          ) : (
            <dl className="space-y-4">
              <div>
                <dt className="text-sm text-muted-foreground">Name</dt>
                <dd className="font-medium">{visitor.name}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">Phone</dt>
                <dd className="font-medium">{visitor.phone}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">ID Type</dt>
                <dd className="font-medium">
                  {visitor.id_type.replace(/_/g, " ")}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">ID Number</dt>
                <dd className="font-medium">{visitor.id_number}</dd>
              </div>
              {visitor.photo_url && (
                <div>
                  <dt className="text-sm text-muted-foreground">Photo</dt>
                  <dd>
                    <img
                      src={visitor.photo_url}
                      alt="Visitor"
                      className="mt-1 h-20 w-20 rounded-md object-cover"
                    />
                  </dd>
                </div>
              )}
            </dl>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        title="Delete Visitor"
        description="This will soft-delete the visitor. The data can be recovered by an administrator."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}
