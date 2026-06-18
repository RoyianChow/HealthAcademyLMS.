"use client";

import { useState, useTransition, useEffect } from "react";
import { Ban, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  banUserAction,
  unbanUserAction,
  type BanType,
} from "@/app/actions/community/ban-user";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type BanFormProps = {
  userId: string;
  userName: string | null;
  initialIsBanned?: boolean;
  initialReason?: string | null;
  initialBanExpires?: Date | string | null;
  initialBanType?: BanType;
};

export function BanForm({
  userId,
  userName,
  initialIsBanned = false,
  initialReason = "",
  initialBanExpires = null,
  initialBanType = "community",
}: BanFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [banType, setBanType] = useState<BanType>(initialBanType);

  const getDefaultDateString = () => {
    if (initialIsBanned) {
      return initialBanExpires
        ? new Date(initialBanExpires).toISOString().split("T")[0]
        : "";
    }
    const future = new Date();
    future.setDate(future.getDate() + 7);
    return future.toISOString().split("T")[0];
  };

  const [reason, setReason] = useState(initialReason || "");
  const [dateValue, setDateValue] = useState(getDefaultDateString());

  useEffect(() => {
    if (isOpen) {
      setReason(initialReason || "");
      setDateValue(getDefaultDateString());
      setBanType(initialBanType);
    }
  }, [isOpen, initialReason, initialBanExpires, initialIsBanned, initialBanType]);

  const handleBanSubmit = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      toast.error("Please provide a reason for the ban.");
      return;
    }
    if (!dateValue) {
      toast.error("Please select a valid expiration calendar date.");
      return;
    }

    startTransition(async () => {
      const result = await banUserAction(userId, reason, dateValue, banType);

      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success(`Successfully updated restrictions for ${userName || "User"}.`);
        setIsOpen(false);
      }
    });
  };

  const handleUnbanSubmit = (e: React.MouseEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const result = await unbanUserAction(userId, banType);

      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success(`Restrictions completely removed for ${userName || "User"}.`);
        setIsOpen(false);
      }
    });
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={`size-8 ${
            initialIsBanned
              ? "text-red-500 hover:bg-red-500/10 hover:text-red-600"
              : "text-muted-foreground hover:bg-orange-500/10 hover:text-orange-500"
          }`}
          title={initialIsBanned ? "Modify / Lift Ban" : "Ban User"}
        >
          <Ban className="size-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>
            {initialIsBanned ? `Manage Ban: ${userName || "User"}` : `Ban ${userName || "User"}?`}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {initialIsBanned
              ? "This user is currently restricted. You can adjust their parameters below or lift the restriction entirely."
              : banType === "site"
                ? "This will block the user from signing in and accessing the entire site."
                : "This will temporarily revoke this user's ability to create posts, comment, and like content."}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Ban type</label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={banType === "community" ? "default" : "outline"}
                size="sm"
                onClick={() => setBanType("community")}
                disabled={pending}
              >
                Community only
              </Button>
              <Button
                type="button"
                variant={banType === "site" ? "destructive" : "outline"}
                size="sm"
                onClick={() => setBanType("site")}
                disabled={pending}
              >
                Entire site
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Reason for ban</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Violating community guidelines"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={pending}
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="ban-expiry"
              className="text-sm font-medium text-foreground"
            >
              Ban expires (Select Date)
            </label>
            <input
              id="ban-expiry"
              type="date"
              value={dateValue}
              min={new Date().toISOString().split("T")[0]}
              onChange={(e) => setDateValue(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 text-foreground scheme-light dark:scheme-dark"
              disabled={pending}
            />
          </div>
        </div>

        <AlertDialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-0">
          <div className="flex w-full justify-between gap-2">
            {initialIsBanned ? (
              <Button
                type="button"
                variant="outline"
                onClick={handleUnbanSubmit}
                disabled={pending}
                className="border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-700 bg-background"
              >
                {pending ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <ShieldCheck className="mr-2 size-4" />
                )}
                Unban
              </Button>
            ) : (
              <div />
            )}

            <div className="flex gap-2">
              <AlertDialogCancel disabled={pending} className="mt-0">
                Cancel
              </AlertDialogCancel>
              <Button
                variant={initialIsBanned ? "default" : "destructive"}
                onClick={handleBanSubmit}
                disabled={pending}
              >
                {pending ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <Ban className="mr-2 size-4" />
                )}
                {pending ? "Processing..." : initialIsBanned ? "Update Ban" : "Confirm Ban"}
              </Button>
            </div>
          </div>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
