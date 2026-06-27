"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  VerificationForm,
  type VerificationFormData,
} from "@/components/security/verification-form";

interface InlineVerificationDialogProps {
  open: boolean;
  loading?: boolean;
  initialData?: Partial<VerificationFormData>;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: VerificationFormData) => void;
}

export function InlineVerificationDialog({
  open,
  loading = false,
  initialData,
  onOpenChange,
  onSubmit,
}: InlineVerificationDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Verify Visitor</DialogTitle>
          <DialogDescription>
            Complete verification inline, then continue the gate workflow without leaving the
            scanner page.
          </DialogDescription>
        </DialogHeader>

        <VerificationForm
          key={JSON.stringify(initialData ?? {})}
          initialData={initialData}
          loading={loading}
          onSubmit={onSubmit}
          onCancel={() => onOpenChange(false)}
          submitLabel="Save Verification"
        />
      </DialogContent>
    </Dialog>
  );
}
