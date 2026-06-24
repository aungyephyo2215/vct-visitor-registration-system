"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Car } from "lucide-react";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/status-badge";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { toast } from "sonner";
import type { PaginatedResult } from "@/lib/types";

interface Vehicle {
  id: string;
  plate_number: string;
  vehicle_type: string;
  brand: string | null;
  color: string | null;
  owner_type: string;
  status: string;
  created_at: string;
  ownerUser: { id: string; name: string } | null;
  ownerVisitor: { id: string; name: string } | null;
}

export default function VehiclesPage() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch vehicles
  useEffect(() => {
    let cancelled = false;
    async function fetchVehicles() {
      setLoading(true);
      try {
        const params: Record<string, string | number> = { page, limit: 20 };
        if (debouncedSearch) params.search = debouncedSearch;

        const result = await api.get<PaginatedResult<Vehicle>>("/api/v1/vehicles", params);
        if (!cancelled) {
          setVehicles(result.data);
          setTotalPages(result.totalPages);
          setTotal(result.total);
        }
      } catch {
        if (!cancelled) toast.error("Failed to load vehicles");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchVehicles();
    return () => {
      cancelled = true;
    };
  }, [page, debouncedSearch, refreshKey]);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await api.del(`/api/v1/vehicles/${deleteId}`);
      toast.success("Vehicle deleted");
      setDeleteId(null);
      setRefreshKey((k) => k + 1);
    } catch {
      toast.error("Failed to delete vehicle");
    }
  };

  const getOwnerName = (vehicle: Vehicle) => {
    if (vehicle.ownerUser) return vehicle.ownerUser.name;
    if (vehicle.ownerVisitor) return vehicle.ownerVisitor.name;
    return "—";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Vehicles</h1>
          <p className="text-muted-foreground">Manage registered vehicles</p>
        </div>
        <Link href="/vehicles/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Vehicle
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search by plate number, brand, or color..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : vehicles.length === 0 ? (
            <div className="text-muted-foreground flex flex-col items-center justify-center py-12">
              <Car className="mb-4 h-12 w-12" />
              <p>No vehicles found</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Plate Number</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Brand</TableHead>
                    <TableHead>Color</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vehicles.map((vehicle) => (
                    <TableRow
                      key={vehicle.id}
                      className="cursor-pointer"
                      onClick={() => router.push(`/vehicles/${vehicle.id}`)}
                    >
                      <TableCell className="font-medium">{vehicle.plate_number}</TableCell>
                      <TableCell>{vehicle.vehicle_type.replace(/_/g, " ")}</TableCell>
                      <TableCell>{vehicle.brand || "—"}</TableCell>
                      <TableCell>{vehicle.color || "—"}</TableCell>
                      <TableCell>{getOwnerName(vehicle)}</TableCell>
                      <TableCell>
                        <StatusBadge status={vehicle.status} />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/vehicles/${vehicle.id}`);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteId(vehicle.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="mt-4 flex items-center justify-between">
                <p className="text-muted-foreground text-sm">
                  {total} vehicle{total !== 1 ? "s" : ""} total
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    Previous
                  </Button>
                  <span className="text-sm">
                    Page {page} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        title="Delete Vehicle"
        description="Are you sure you want to delete this vehicle? This action can be reversed by an administrator."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}
