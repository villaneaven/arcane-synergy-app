"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { API_BASE_URL } from "@/lib/api";
import type { Gap, GapStatusUpdate } from "./columns";

const TEAM_STATUSES = ["Submitted", "Pending"];

interface TeamStatusCellProps {
  gap: Gap;
  onSaved: (gap: Gap, update: GapStatusUpdate) => void;
}

export function TeamStatusCell({ gap, onSaved }: TeamStatusCellProps) {
  const { data: session } = useSession();
  const [isSaving, setIsSaving] = useState(false);

  const handleChange = async (teamStatus: string) => {
    if (teamStatus === gap.teamStatus) return;
    const accessToken = (session as { access_token?: string })?.access_token;

    setIsSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/gaps/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          insurance: gap.insurance,
          memberId: gap.memberId,
          metricType: gap.metricType,
          teamStatus,
        }),
      });

      if (!res.ok) {
        const message = res.status === 409 ? await res.text() : null;
        throw new Error(message || `Failed to save status (${res.status})`);
      }

      const update: GapStatusUpdate = await res.json();
      onSaved(gap, update);
    } catch (error) {
      console.error("Error saving team status:", error);
      toast.error(
        error instanceof Error && error.message.startsWith("Someone")
          ? error.message
          : "Failed to save team status. Try again later.",
        { position: "top-center" },
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Select
      value={gap.teamStatus ?? ""}
      onValueChange={handleChange}
      disabled={isSaving}
    >
      <SelectTrigger size="sm" className="w-32" aria-label="Team status">
        <SelectValue placeholder="Set status" />
      </SelectTrigger>
      <SelectContent>
        {TEAM_STATUSES.map((status) => (
          <SelectItem key={status} value={status}>
            {status}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
