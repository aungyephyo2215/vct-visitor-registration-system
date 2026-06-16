import Link from "next/link";
import { Settings as SettingsIcon, ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          System configuration and preferences
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-muted p-3">
              <SettingsIcon className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <CardTitle>Available in Future Phase</CardTitle>
              <CardContent className="p-0 pt-1 text-sm text-muted-foreground">
                Settings are planned for a future phase. This will include
                property management, user management, and system preferences.
                Use the Dashboard for current visitor activity.
              </CardContent>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Link href="/dashboard">
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
