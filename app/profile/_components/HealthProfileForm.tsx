"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { updateHealthProfileAction } from "@/app/profile/actions/update-health-profile";

type HealthProfileFormProps = {
  initialHealthGoals: string[];
  initialDietaryFocus: string[];
};

export function HealthProfileForm({
  initialHealthGoals,
  initialDietaryFocus,
}: HealthProfileFormProps) {
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);

        startTransition(async () => {
          const result = await updateHealthProfileAction(formData);

          if (result?.error) {
            toast.error(result.error);
            return;
          }

          toast.success("Health profile updated.");
        });
      }}
    >
      <div className="space-y-2">
        <label htmlFor="healthGoals" className="text-sm font-medium">
          Health goals
        </label>
        <input
          id="healthGoals"
          name="healthGoals"
          defaultValue={initialHealthGoals.join(", ")}
          placeholder="e.g. improve energy, reduce stress, support gut health"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          disabled={pending}
        />
        <p className="text-xs text-muted-foreground">
          Separate multiple goals with commas. These help personalize your AI Advisor.
        </p>
      </div>

      <div className="space-y-2">
        <label htmlFor="dietaryFocus" className="text-sm font-medium">
          Dietary focus
        </label>
        <input
          id="dietaryFocus"
          name="dietaryFocus"
          defaultValue={initialDietaryFocus.join(", ")}
          placeholder="e.g. gluten-free, plant-forward, low sugar"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          disabled={pending}
        />
        <p className="text-xs text-muted-foreground">
          Separate multiple focus areas with commas.
        </p>
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Saving..." : "Save health profile"}
      </Button>
    </form>
  );
}
