"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Car } from "lucide-react";
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

export default function NewVehiclePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    plate_number: "",
    vehicle_type: "CAR",
    brand: "",
    color: "",
    owner_type: "RESIDENT",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!form.plate_number) {
      setError("Plate number is required");
      return;
    }

    setLoading(true);
    try {
      const payload: Record<string, unknown> = {
        plate_number: form.plate_number,
        vehicle_type: form.vehicle_type,
        owner_type: form.owner_type,
      };
      if (form.brand) payload.brand = form.brand;
      if (form.color) payload.color = form.color;

      await api.post("/api/v1/vehicles", payload);
      toast.success("Vehicle created");
      router.push("/vehicles");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create vehicle");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/vehicles">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">New Vehicle</h1>
          <p className="text-muted-foreground">Register a new vehicle</p>
        </div>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="bg-muted rounded-lg p-3">
              <Car className="text-muted-foreground h-6 w-6" />
            </div>
            <CardTitle>Vehicle Information</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="plate_number">Plate Number *</Label>
              <Input
                id="plate_number"
                placeholder="e.g. ABC-1234"
                value={form.plate_number}
                onChange={(e) => setForm({ ...form, plate_number: e.target.value.toUpperCase() })}
                maxLength={20}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="vehicle_type">Vehicle Type *</Label>
              <Select
                value={form.vehicle_type}
                onValueChange={(value) => setForm({ ...form, vehicle_type: value ?? "" })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VEHICLE_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="brand">Brand</Label>
                <Input
                  id="brand"
                  placeholder="e.g. Toyota"
                  value={form.brand}
                  onChange={(e) => setForm({ ...form, brand: e.target.value })}
                  maxLength={50}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="color">Color</Label>
                <Input
                  id="color"
                  placeholder="e.g. White"
                  value={form.color}
                  onChange={(e) => setForm({ ...form, color: e.target.value })}
                  maxLength={30}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="owner_type">Owner Type *</Label>
              <Select
                value={form.owner_type}
                onValueChange={(value) => setForm({ ...form, owner_type: value ?? "" })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="RESIDENT">Resident</SelectItem>
                  <SelectItem value="VISITOR">Visitor</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {error && (
              <div className="bg-destructive/10 text-destructive rounded-md px-3 py-2 text-sm">
                {error}
              </div>
            )}

            <div className="flex items-center gap-4">
              <Button type="submit" disabled={loading}>
                {loading ? "Creating..." : "Create Vehicle"}
              </Button>
              <Link href="/vehicles">
                <Button variant="outline" type="button">
                  Cancel
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
