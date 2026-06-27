"use client";

import { useState } from "react";
import { CheckCircle, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { ID_TYPES, type VerificationFormPayload } from "@/types/security-workflow";

interface VerificationFormProps {
  initialData?: Partial<VerificationFormPayload>;
  loading?: boolean;
  onSubmit: (data: VerificationFormPayload) => void;
  onCancel?: () => void;
  submitLabel?: string;
}

export type VerificationFormData = VerificationFormPayload;

export function VerificationForm({
  initialData,
  loading = false,
  onSubmit,
  onCancel,
  submitLabel = "Verify Visitor",
}: VerificationFormProps) {
  const [visitorName, setVisitorName] = useState(initialData?.visitor_name ?? "");
  const [visitorPhone, setVisitorPhone] = useState(initialData?.visitor_phone ?? "");
  const [visitorIdType, setVisitorIdType] = useState(initialData?.visitor_id_type ?? "");
  const [visitorIdNumber, setVisitorIdNumber] = useState(initialData?.visitor_id_number ?? "");
  const [photoUrl, setPhotoUrl] = useState(initialData?.photo_url ?? "");
  const [vehicleNumber, setVehicleNumber] = useState(initialData?.vehicle_number ?? "");
  const [ndaSigned, setNdaSigned] = useState(initialData?.nda_signed ?? false);
  const [safetySigned, setSafetySigned] = useState(initialData?.safety_form_signed ?? false);
  const [photoSizeError, setPhotoSizeError] = useState<string | null>(null);

  const handleSubmit = () => {
    if (!visitorName.trim() || !visitorPhone.trim()) return;

    if (photoUrl && photoUrl.startsWith("data:")) {
      const sizeBytes = (photoUrl.length * 3) / 4;
      if (sizeBytes > 1024 * 1024) {
        setPhotoSizeError("Photo is too large. Maximum size is 1MB.");
        return;
      }
    }

    setPhotoSizeError(null);
    onSubmit({
      visitor_name: visitorName.trim(),
      visitor_phone: visitorPhone.trim(),
      visitor_id_type: visitorIdType || undefined,
      visitor_id_number: visitorIdNumber.trim() || undefined,
      photo_url: photoUrl || undefined,
      vehicle_number: vehicleNumber.trim() || undefined,
      nda_signed: ndaSigned,
      safety_form_signed: safetySigned,
    });
  };

  return (
    <Card className="border-0 shadow-none">
      <CardHeader className="px-0 pt-0">
        <CardTitle className="flex items-center gap-2 text-lg">
          <FileText className="h-5 w-5" />
          Verify Visitor Identity
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 px-0 pb-0">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="visitorName">Visitor Name *</Label>
            <Input
              id="visitorName"
              value={visitorName}
              onChange={(e) => setVisitorName(e.target.value)}
              placeholder="Full name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="visitorPhone">Phone Number *</Label>
            <Input
              id="visitorPhone"
              value={visitorPhone}
              onChange={(e) => setVisitorPhone(e.target.value)}
              placeholder="+959..."
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="idType">ID Type</Label>
            <Select value={visitorIdType} onValueChange={(value) => setVisitorIdType(value ?? "")}>
              <SelectTrigger>
                <SelectValue placeholder="Select ID type" />
              </SelectTrigger>
              <SelectContent>
                {ID_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="idNumber">ID Number</Label>
            <Input
              id="idNumber"
              value={visitorIdNumber}
              onChange={(e) => setVisitorIdNumber(e.target.value)}
              placeholder="ID number"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="vehicleNumber">Vehicle</Label>
            <Input
              id="vehicleNumber"
              value={vehicleNumber}
              onChange={(e) => setVehicleNumber(e.target.value)}
              placeholder="e.g. ABC-1234"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="photoUrl">Visitor Photo</Label>
            <Input
              id="photoUrl"
              value={photoUrl}
              onChange={(e) => setPhotoUrl(e.target.value)}
              placeholder="data:image/... or https://..."
            />
          </div>
        </div>

        {photoSizeError && (
          <div className="text-destructive border-destructive/20 bg-destructive/5 rounded-md border px-3 py-2 text-sm">
            {photoSizeError}
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
            <input
              type="checkbox"
              checked={ndaSigned}
              onChange={(e) => setNdaSigned(e.target.checked)}
              className="h-4 w-4 rounded"
            />
            <span>NDA Signed</span>
          </label>
          <label className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
            <input
              type="checkbox"
              checked={safetySigned}
              onChange={(e) => setSafetySigned(e.target.checked)}
              className="h-4 w-4 rounded"
            />
            <span>Safety Form Signed</span>
          </label>
        </div>

        <Separator />

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            onClick={handleSubmit}
            disabled={loading || !visitorName.trim() || !visitorPhone.trim()}
            className="flex-1"
            size="lg"
          >
            {loading ? (
              "Processing..."
            ) : (
              <>
                <CheckCircle className="mr-2 h-5 w-5" />
                {submitLabel}
              </>
            )}
          </Button>
          {onCancel && (
            <Button onClick={onCancel} variant="outline" size="lg">
              Cancel
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
