"use client";

import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  title?: string;
  message?: string;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  confirmLabel?: string;
}

export function ConfirmDeleteModal({
  isOpen,
  title = "Delete Product",
  message = "Are you sure you want to delete this product? This action cannot be undone.",
  loading,
  onCancel,
  onConfirm,
  confirmLabel = "Delete Product",
}: ConfirmDeleteModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onCancel} title={title}>
      <div className="space-y-4 py-2">
        <p className="text-sm text-slate-600">{message}</p>
        <div className="flex justify-end gap-3">
          <Button variant="outline" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="danger" size="sm" onClick={onConfirm} disabled={loading} isLoading={loading}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
