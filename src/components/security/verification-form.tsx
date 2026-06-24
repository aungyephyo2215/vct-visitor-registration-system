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
import { ID_TYPES, type VerificationFormData } from "@/types/security-workflow";

interface VerificationFormProps {
  initialName?: string;
  initialPhone?: string;
  loading?: boolean;
  onSubmit: (data: VerificationFormData) => void;
  onCancel?: () => void;
  submitLabel?: string;
  showPhotoField?: boolean;
}

/**
 * Reusable verification form for the security gate workflow.
 *
 * Pre-fills from invitation data (initialName, initialPhone).
 * Validates photo size (max 1MB base64).
 * Returns structured data via onSubmit callback.
 */
export function VerificationForm({
  initialName = "",
  initialPhone = "",
  loading = false,
  onSubmit,
  onCancel,
  submitLabel = "Verify & Check In",
  showPhotoField = false,
}: VerificationFormProps) {
  const [visitorName, setVisitorName] = useState(initialName);
  const [visitorPhone, setVisitorPhone] = useState(initialPhone);
  const [visitorIdType, setVisitorIdType] = useState("");
  const [visitorIdNumber, setVisitorIdNumber] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [ndaSigned, setNdaSigned] = useState(false);
  const [safetySigned, setSafetySigned] = useState(false);

  const handleSubmit = () => {
    if (!visitorName.trim() || !visitorPhone.trim()) return;

    // Validate photo size
    if (photoUrl && photoUrl.startsWith("data:")) {
      const sizeBytes = (photoUrl.length * 3) / 4;
      if (sizeBytes > 1024 * 1024) return; // 1MB limit
    }

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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Verify Visitor Identity
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
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

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="idType">ID Type</Label>
            <Select value={visitorIdType} onValueChange={(v) => setVisitorIdType(v ?? "")}>
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

        <div className="space-y-2">
          <Label htmlFor="vehicleNumber">Vehicle Number</Label>
          <Input
            id="vehicleNumber"
            value={vehicleNumber}
            onChange={(e) => setVehicleNumber(e.target.value)}
            placeholder="e.g. ABC-1234"
          />
        </div>

        {showPhotoField && (
          <div className="space-y-2">
            <Label htmlFor="photoUrl">Photo (Base64 or URL)</Label>
            <Input
              id="photoUrl"
              value={photoUrl}
              onChange={(e) => setPhotoUrl(e.target.value)}
              placeholder="data:image/... or https://..."
            />
          </div>
        )}

        <div className="flex items-center gap-6">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={ndaSigned}
              onChange={(e) => setNdaSigned(e.target.checked)}
              className="h-4 w-4 rounded"
            />
            <span className="text-sm">NDA Signed</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={safetySigned}
              onChange={(e) => setSafetySigned(e.target.checked)}
              className="h-4 w-4 rounded"
            />
            <span className="text-sm">Safety Form Signed</span>
          </label>
        </div>

        <Separator />

        <div className="flex gap-3">
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
