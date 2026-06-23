"use client";

import React from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

interface MessageComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

/**
 * Controlled input + send button. The parent owns the value (so
 * optimistic clear and rollback can stay in the page state) and the
 * submit handler (which fires the server action).
 */
export function MessageComposer({ value, onChange, onSubmit }: MessageComposerProps) {
  return (
    <form onSubmit={onSubmit} className="p-4 bg-white border-t border-gray-200 flex gap-3">
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Type a message..."
        className="flex-1"
      />
      <Button type="submit" disabled={!value.trim()}>
        Send
      </Button>
    </form>
  );
}
