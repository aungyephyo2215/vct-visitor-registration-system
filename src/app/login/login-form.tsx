"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  QrCode,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  User,
  Shield,
  Key,
} from "lucide-react";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/lib/auth-context";
import type { SafeUser } from "@/lib/types";

const DEMO_ACCOUNTS = [
  {
    role: "Super Admin",
    email: "admin@vrs.com",
    password: "Admin123!",
    icon: Shield,
    badge: "Full Access",
  },
  {
    role: "Property Manager",
    email: "property@vrs.com",
    password: "Admin123!",
    icon: User,
  },
  {
    role: "Security Guard",
    email: "guard@vrs.com",
    password: "Guard123!",
    icon: User,
  },
  {
    role: "Resident Owner",
    email: "resident@vrs.com",
    password: "Resident123!",
    icon: User,
  },
  {
    role: "Office Staff",
    email: "office@vrs.com",
    password: "Office123!",
    icon: User,
  },
];

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refresh } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showDemo, setShowDemo] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function copyToClipboard(text: string, label: string) {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  }

  function fillDemo(email: string, password: string) {
    setEmail(email);
    setPassword(password);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Email and password are required");
      return;
    }

    setLoading(true);
    try {
      await api.post<{ user: SafeUser }>("/api/v1/auth/login", {
        email,
        password,
      });
      await refresh();
      const redirect = searchParams.get("redirect") || "/dashboard";
      router.push(redirect);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-muted/30 flex flex-1 items-center justify-center px-4 py-12">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="bg-primary/10 mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full">
            <QrCode className="text-primary h-6 w-6" />
          </div>
          <CardTitle className="text-xl">Sign In</CardTitle>
          <CardDescription>Enter your credentials to access the system</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@vrs.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                disabled={loading}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  disabled={loading}
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute top-0 right-0 h-full px-3"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="text-muted-foreground h-4 w-4" />
                  ) : (
                    <Eye className="text-muted-foreground h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            {error && (
              <div className="bg-destructive/10 text-destructive rounded-md px-3 py-2 text-sm">
                {error}
              </div>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          {/* Demo Credentials Accordion */}
          <div className="mt-6">
            <button
              type="button"
              onClick={() => setShowDemo(!showDemo)}
              className="text-muted-foreground hover:bg-muted/50 hover:text-foreground flex w-full items-center justify-between rounded-md border px-3 py-2 text-sm transition-colors"
            >
              <div className="flex items-center gap-2">
                <Key className="h-3.5 w-3.5" />
                <span>Demo Accounts</span>
              </div>
              {showDemo ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>

            {showDemo && (
              <div className="mt-2 divide-y rounded-md border text-sm">
                {DEMO_ACCOUNTS.map((account) => (
                  <div
                    key={account.email}
                    className="hover:bg-muted/30 flex items-center justify-between px-3 py-2"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <account.icon className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
                      <div className="truncate">
                        <span className="font-medium">{account.role}</span>
                        {account.badge && (
                          <span className="bg-primary/10 text-primary ml-1.5 inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium">
                            {account.badge}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger
                            onClick={() => fillDemo(account.email, account.password)}
                            className="text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer rounded border-none bg-transparent p-1 transition-colors"
                          >
                            <Key className="h-3 w-3" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Fill credentials</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger
                            onClick={() => copyToClipboard(account.email, `email-${account.email}`)}
                            className="text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer rounded border-none bg-transparent p-1 transition-colors"
                          >
                            {copied === `email-${account.email}` ? (
                              <Check className="h-3 w-3 text-green-500" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Copy email</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                ))}
                <div className="text-muted-foreground px-3 py-1.5 text-[11px]">
                  Click <Key className="inline h-2.5 w-2.5" /> to auto-fill form,{" "}
                  <Copy className="inline h-2.5 w-2.5" /> to copy email
                </div>
              </div>
            )}
          </div>

          <div className="text-muted-foreground mt-4 text-center text-sm">
            <Link href="/" className="hover:text-foreground">
              Back to home
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
