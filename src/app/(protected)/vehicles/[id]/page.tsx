"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Car, Pencil, Trash2 } from "lucide-react";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/status-badge";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { toast } from "sonner";

const VEHICLE_TYPES = [
  "CAR",
  "MOTORCYCLE",
  "TRUCK",
  "VAN",
  "BUS",
  "BICYCLE",
  "ELECTRIC_SCOOTER",
  "OTHER",
];

interface VehicleDetail {
  id: string;
  plate_number: string;
  vehicle_type: string;
  brand: string | null;
  color: string | null;
  owner_type: string;
  owner_user_id: string | null;
  owner_visitor_id: string | null;
  status: string;
  created_at: string;
  ownerUser: { id: string; name: string; email: string } | null;
  ownerVisitor: { id: string; name: string; phone: string } | null;
  visits: Array<{
    id: string;
    status: string;
    checkin_time: string | null;
    checkout_time: string | null;
    purpose: string;
    unit: { unit_no: string } | null;
  }>;
}

export default function VehicleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [vehicle, setVehicle] = useState<VehicleDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    plate_number: "",
    vehicle_type: "",
    brand: "",
    color: "",
    status: "",
  });

  useEffect(() => {
    let cancelled = false;
    async function fetchVehicle() {
      try {
        const data = await api.get<VehicleDetail>(`/api/v1/vehicles/${params.id}`);
        if (!cancelled) {
          setVehicle(data);
          setForm({
            plate_number: data.plate_number,
            vehicle_type: data.vehicle_type,
            brand: data.brand || "",
            color: data.color || "",
            status: data.status,
          });
        }
      } catch {
        if (!cancelled) {
          toast.error("Vehicle not found");
          router.push("/vehicles");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchVehicle();
    return () => {
      cancelled = true;
    };
  }, [params.id, router]);

  const handleSave = async () => {
    setError("");
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {};
      if (form.plate_number !== vehicle?.plate_number) payload.plate_number = form.plate_number;
      if (form.vehicle_type !== vehicle?.vehicle_type) payload.vehicle_type = form.vehicle_type;
      if (form.brand !== (vehicle?.brand || "")) payload.brand = form.brand || null;
      if (form.color !== (vehicle?.color || "")) payload.color = form.color || null;
      if (form.status !== vehicle?.status) payload.status = form.status;

      if (Object.keys(payload).length === 0) {
        setEditing(false);
        return;
      }

      const updated = await api.patch<VehicleDetail>(`/api/v1/vehicles/${params.id}`, payload);
      setVehicle(updated);
      setEditing(false);
      toast.success("Vehicle updated");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update vehicle");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await api.del(`/api/v1/vehicles/${params.id}`);
      toast.success("Vehicle deleted");
      router.push("/vehicles");
    } catch {
      toast.error("Failed to delete vehicle");
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!vehicle) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/vehicles">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{vehicle.plate_number}</h1>
            <p className="text-muted-foreground">
              {vehicle.vehicle_type.replace(/_/g, " ")} · Registered{" "}
              {new Date(vehicle.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!editing && (
            <>
              <Button variant="outline" onClick={() => setEditing(true)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </Button>
              <Button variant="destructive" onClick={() => setShowDelete(true)}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="bg-muted rounded-lg p-3">
                <Car className="text-muted-foreground h-6 w-6" />
              </div>
              <CardTitle>Vehicle Information</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {editing ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Plate Number</Label>
                  <Input
                    value={form.plate_number}
                    onChange={(e) =>
                      setForm({ ...form, plate_number: e.target.value.toUpperCase() })
                    }
                    maxLength={20}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Vehicle Type</Label>
                  <Select
                    value={form.vehicle_type}
                    onValueChange={(v) => setForm({ ...form, vehicle_type: v ?? "" })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {VEHICLE_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t.replace(/_/g, " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Brand</Label>
                    <Input
                      value={form.brand}
                      onChange={(e) => setForm({ ...form, brand: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Color</Label>
                    <Input
                      value={form.color}
                      onChange={(e) => setForm({ ...form, color: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={form.status}
                    onValueChange={(v) => setForm({ ...form, status: v ?? "" })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE">Active</SelectItem>
                      <SelectItem value="BLOCKED">Blocked</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {error && (
                  <div className="bg-destructive/10 text-destructive rounded-md px-3 py-2 text-sm">
                    {error}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Button onClick={handleSave} disabled={saving}>
                    {saving ? "Saving..." : "Save Changes"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditing(false);
                      setError("");
                      setForm({
                        plate_number: vehicle.plate_number,
                        vehicle_type: vehicle.vehicle_type,
                        brand: vehicle.brand || "",
                        color: vehicle.color || "",
                        status: vehicle.status,
                      });
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <dl className="grid gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-muted-foreground text-sm">Plate Number</dt>
                  <dd className="font-medium">{vehicle.plate_number}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-sm">Type</dt>
                  <dd className="font-medium">{vehicle.vehicle_type.replace(/_/g, " ")}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-sm">Brand</dt>
                  <dd className="font-medium">{vehicle.brand || "—"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-sm">Color</dt>
                  <dd className="font-medium">{vehicle.color || "—"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-sm">Owner Type</dt>
                  <dd className="font-medium">{vehicle.owner_type}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-sm">Owner</dt>
                  <dd className="font-medium">
                    {vehicle.ownerUser?.name || vehicle.ownerVisitor?.name || "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-sm">Status</dt>
                  <dd>
                    <StatusBadge status={vehicle.status} />
                  </dd>
                </div>
              </dl>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Visit History</CardTitle>
          </CardHeader>
          <CardContent>
            {vehicle.visits.length === 0 ? (
              <p className="text-muted-foreground text-sm">No visits recorded</p>
            ) : (
              <div className="space-y-3">
                {vehicle.visits.map((visit) => (
                  <div
                    key={visit.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {visit.purpose.replace(/_/g, " ")}
                        {visit.unit && ` · Unit ${visit.unit.unit_no}`}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {visit.checkin_time
                          ? `Checked in: ${new Date(visit.checkin_time).toLocaleString()}`
                          : "Not checked in"}
                      </p>
                    </div>
                    <StatusBadge status={visit.status} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        title="Delete Vehicle"
        description="Are you sure you want to delete this vehicle? This action can be reversed by an administrator."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}
