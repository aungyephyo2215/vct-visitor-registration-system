"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  CheckCheck,
  Mail,
  CheckCircle,
  XCircle,
  QrCode,
  ShieldCheck,
  LogIn,
  LogOut,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { api } from "@/lib/api-client";
import type { Notification } from "@/generated/prisma/client";
import type { NotificationType } from "@/generated/prisma/enums";
import { Button } from "@/components/ui/button";

const ICON_MAP: Record<NotificationType, typeof Bell> = {
  INVITATION_CREATED: Mail,
  INVITATION_APPROVED: CheckCircle,
  INVITATION_REJECTED: XCircle,
  QR_GENERATED: QrCode,
  VISITOR_VERIFIED: ShieldCheck,
  CHECKED_IN: LogIn,
  CHECKED_OUT: LogOut,
};

const ICON_COLOR: Record<NotificationType, string> = {
  INVITATION_CREATED: "text-amber-600",
  INVITATION_APPROVED: "text-green-600",
  INVITATION_REJECTED: "text-red-600",
  QR_GENERATED: "text-blue-600",
  VISITOR_VERIFIED: "text-green-600",
  CHECKED_IN: "text-green-600",
  CHECKED_OUT: "text-slate-600",
};

interface PaginatedResult<T> {
  data: T[];
  total: number;
}

export function NotificationBell() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const result = await api.get<{ count: number }>("/api/v1/notifications/unread-count");
      setUnreadCount(result.count);
    } catch {
      // silently ignore
    }
  }, []);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.get<PaginatedResult<Notification>>("/api/v1/notifications?limit=20");
      setNotifications(result.data);
    } catch {
      // silently ignore
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch + 30s polling for unread count
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    fetchUnreadCount();
    fetchList();
    const interval = setInterval(fetchUnreadCount, 30_000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount, fetchList]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClick);
    }
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  async function handleMarkRead(notifId: string) {
    try {
      await api.patch(`/api/v1/notifications/${notifId}/read`);
      setNotifications((prev) => prev.map((n) => (n.id === notifId ? { ...n, is_read: true } : n)));
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      // silently ignore
    }
  }

  async function handleMarkAllRead() {
    try {
      await api.patch("/api/v1/notifications/mark-all-read", {});
      await fetchUnreadCount();
      await fetchList();
    } catch (err) {
      console.error("Mark all read failed:", err);
    }
  }

  function handleNavigate(notif: Notification) {
    if (!notif.is_read) {
      handleMarkRead(notif.id);
    }
    setOpen(false);
    if (notif.action_url) {
      router.push(notif.action_url);
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="ghost"
        size="icon"
        className="relative h-8 w-8"
        onClick={() => {
          setOpen(!open);
          if (!open) fetchList();
        }}
        aria-label="Notifications"
      >
        <Bell className="text-muted-foreground h-5 w-5" />
        {unreadCount > 0 && (
          <span className="bg-destructive text-destructive-foreground absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </Button>

      {open && (
        <div className="bg-background absolute right-0 z-50 mt-2 w-80 rounded-lg border shadow-lg">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <span className="text-sm font-semibold">Notifications</span>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs"
              >
                <CheckCheck className="h-3 w-3" />
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="border-primary h-5 w-5 animate-spin rounded-full border-2 border-t-transparent" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-muted-foreground px-4 py-8 text-center text-sm">
                <Bell className="mx-auto mb-2 h-6 w-6 opacity-30" />
                No notifications
              </div>
            ) : (
              notifications.map((notif) => {
                const Icon = ICON_MAP[notif.type] || Bell;
                const color = ICON_COLOR[notif.type] || "text-muted-foreground";
                return (
                  <button
                    key={notif.id}
                    onClick={() => handleNavigate(notif)}
                    className={`hover:bg-muted/50 flex w-full items-start gap-3 px-4 py-3 text-left transition-colors ${
                      !notif.is_read ? "bg-muted/30" : ""
                    }`}
                  >
                    <div className="mt-0.5 shrink-0">
                      <Icon className={`h-4 w-4 ${color}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium">{notif.title}</span>
                        {!notif.is_read && (
                          <span className="bg-primary h-2 w-2 shrink-0 rounded-full" />
                        )}
                      </div>
                      <p className="text-muted-foreground line-clamp-2 text-xs">{notif.message}</p>
                      <p className="text-muted-foreground/70 mt-1 text-[10px]">
                        {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
