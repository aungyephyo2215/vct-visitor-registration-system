"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Search, Pencil, Trash2 } from "lucide-react";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/confirm-dialog";

interface Visitor {
  id: string;
  name: string;
  phone: string;
  id_type: string;
  id_number: string;
  created_at: string;
}

interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function VisitorsPage() {
  const router = useRouter();
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, limit: 20 };
      if (debouncedSearch) params.search = debouncedSearch;
      const result = await api.get<PaginatedResult<Visitor>>(
        "/api/v1/visitors",
        params
      );
      setVisitors(result.data);
      setTotalPages(result.totalPages);
      setTotal(result.total);
    } catch {
      toast.error("Failed to load visitors");
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleDelete(id: string) {
    try {
      await api.del(`/api/v1/visitors/${id}`);
      toast.success("Visitor deleted");
      load();
    } catch {
      toast.error("Failed to delete visitor");
    }
    setDeleteId(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Visitors</h1>
          <p className="text-muted-foreground">
            Manage registered visitors
          </p>
        </div>
        <Link href="/visitors/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Visitor
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name, phone, or ID number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : visitors.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              {debouncedSearch
                ? "No visitors found matching your search."
                : "No visitors yet. Add your first visitor."}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>ID Type</TableHead>
                    <TableHead>ID Number</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visitors.map((v) => (
                    <TableRow
                      key={v.id}
                      className="cursor-pointer"
                      onClick={() => router.push(`/visitors/${v.id}`)}
                    >
                      <TableCell className="font-medium">{v.name}</TableCell>
                      <TableCell>{v.phone}</TableCell>
                      <TableCell>{v.id_type.replace(/_/g, " ")}</TableCell>
                      <TableCell>{v.id_number}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(v.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div
                          className="flex gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() =>
                              router.push(`/visitors/${v.id}`)
                            }
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => setDeleteId(v.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4">
                  <p className="text-sm text-muted-foreground">
                    {total} total
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      Previous
                    </Button>
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
              )}
            </>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        title="Delete Visitor"
        description="Are you sure? This action uses soft delete and can be reversed by an administrator."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={() => handleDelete(deleteId!)}
      />
    </div>
  );
}
