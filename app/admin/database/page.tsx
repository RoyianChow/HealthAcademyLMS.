// app/admin/database/page.tsx
"use client";

import { useState } from "react";
import { IconRefresh } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { transferOwnershipAction } from "@/app/actions/database/transfer-ownership";
import { backupDatabaseAction } from "@/app/actions/database/back-up-data";
import { restoreDatabaseAction } from "@/app/actions/database/restore-data";
import { compareDatabaseAction, DatabaseDiff } from "@/app/actions/database/compare-database";

export default function DatabaseManagementPage() {
  const [isPending, setIsPending] = useState(false);
  const [activeTab, setActiveTab] = useState<"transfer" | "backup" | "restore">("transfer");
  const [backupString, setBackupString] = useState("");
  const [restoreString, setRestoreString] = useState("");
  
  const [restoreMode, setRestoreMode] = useState<"sync" | "reset">("sync");
  
  const [isComparing, setIsComparing] = useState(false);
  const [dbDifferences, setDbDifferences] = useState<DatabaseDiff[] | null>(null);

  const [archiveOptions, setArchiveOptions] = useState({
    courses: true,
    posts: true,
    comments: true,
  });

  const handleTabChange = (tab: "transfer" | "backup" | "restore") => {
    setActiveTab(tab);
    setDbDifferences(null);
  };

  const handleDisplayDifferences = async () => {
    const activeConnectionString = activeTab === "backup" ? backupString : restoreString;
    if (!activeConnectionString) {
      alert("Please enter a database connection parameters string first.");
      return;
    }

    setIsComparing(true);
    setDbDifferences(null);

    try {
      const result = await compareDatabaseAction(activeConnectionString);
      if (result.success) {
        setDbDifferences(result.diffs);
      } else {
        alert(result.message);
      }
    } catch (err) {
      alert("An error occurred analyzing environmental differences.");
    } finally {
      setIsComparing(false);
    }
  };

  const handleCheckboxChange = (field: keyof typeof archiveOptions) => {
    setArchiveOptions((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const handleExecute = async () => {
    setIsPending(true);
    try {
      if (activeTab === "transfer") {
        if (!archiveOptions.courses && !archiveOptions.posts && !archiveOptions.comments) {
          alert("Please select at least one item type to archive.");
          return;
        }
        const res = await transferOwnershipAction(archiveOptions);
        alert(res.message);
      } 
      else if (activeTab === "backup") {
        if (!backupString) {
          alert("Please enter a valid target database string.");
          return;
        }
        const res = await backupDatabaseAction(backupString);
        alert(res.message);
      }
      else if (activeTab === "restore") {
        if (!restoreString) {
          alert("Please enter a valid source backup database string.");
          return;
        }
        const res = await restoreDatabaseAction(restoreString, restoreMode);
        alert(res.message);
      }
    } catch (err) {
      alert("An unexpected network error occurred.");
    } finally {
      setIsPending(false);
      setDbDifferences(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 w-full flex flex-col gap-6 animate-in fade-in duration-300">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Database Archive & Backup</h1>
        <p className="text-muted-foreground mt-2">Manage environment states, securely sync data, and manage ownership transfers.</p>
      </div>

      <div className="bg-background border text-foreground p-6 rounded-lg shadow-sm flex flex-col gap-6 w-full">
        {/* Navigation Tabs */}
        <div className="flex gap-1 p-1 bg-secondary rounded-md">
          <button
            onClick={() => handleTabChange("transfer")}
            className={cn("flex-1 text-sm py-2 rounded-sm font-medium transition-colors", activeTab === "transfer" ? "bg-background shadow-sm" : "text-muted-foreground")}
          >
            Transfer
          </button>
          <button
            onClick={() => handleTabChange("backup")}
            className={cn("flex-1 text-sm py-2 rounded-sm font-medium transition-colors", activeTab === "backup" ? "bg-background shadow-sm" : "text-muted-foreground")}
          >
            Backup
          </button>
          <button
            onClick={() => handleTabChange("restore")}
            className={cn("flex-1 text-sm py-2 rounded-sm font-medium transition-colors", activeTab === "restore" ? "bg-background shadow-sm" : "text-muted-foreground")}
          >
            Restore
          </button>
        </div>

        {/* Transfer Ownership */}
        {activeTab === "transfer" && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Moves the associated user id of all selected files to <code>archive-admin-account</code> to prevent data loss if the user is deleted. Select the target entities below.
            </p>
            <div className="flex flex-col gap-4 py-2 border rounded-md p-4 bg-muted/10">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={archiveOptions.courses} onChange={() => handleCheckboxChange("courses")} className="w-5 h-5 accent-primary" />
                <span className="text-sm font-medium">Courses</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={archiveOptions.posts} onChange={() => handleCheckboxChange("posts")} className="w-5 h-5 accent-primary" />
                <span className="text-sm font-medium">Community Posts</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={archiveOptions.comments} onChange={() => handleCheckboxChange("comments")} className="w-5 h-5 accent-primary" />
                <span className="text-sm font-medium">Community Comments</span>
              </label>
            </div>
          </div>
        )}

        {/* Backup Data */}
        {activeTab === "backup" && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Copy the current database content to a backup database environment.
            </p>
            <input 
              type="text" 
              placeholder="postgresql://user:pass@host/db" 
              value={backupString}
              onChange={(e) => { setBackupString(e.target.value); setDbDifferences(null); }}
              className="w-full px-4 py-3 text-sm border rounded-md bg-transparent focus:ring-2 focus:ring-primary outline-none text-foreground font-mono"
            />
          </div>
        )}

        {/* Restore Data */}
        {activeTab === "restore" && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Restore content from a backup database snapshot into the primary environment.
            </p>
            <input 
              type="text" 
              placeholder="postgresql://user:pass@host/backup_db" 
              value={restoreString}
              onChange={(e) => { setRestoreString(e.target.value); setDbDifferences(null); }}
              className="w-full px-4 py-3 text-sm border rounded-md bg-transparent focus:ring-2 focus:ring-primary outline-none text-foreground font-mono"
            />
            
            {/* Restore Mode Selection */}
            <div className="flex flex-col gap-3 py-3 border-t mt-2">
              <span className="text-sm font-semibold">Restoration Mode:</span>
              <label className="flex items-start gap-3 cursor-pointer">
                <input 
                  type="radio" 
                  name="restoreMode" 
                  value="sync" 
                  checked={restoreMode === "sync"} 
                  onChange={() => setRestoreMode("sync")} 
                  className="mt-1 w-4 h-4 accent-primary" 
                />
                <div className="flex flex-col">
                  <span className="text-sm font-medium">Additive Sync (Merge)</span>
                  <span className="text-xs text-muted-foreground mt-0.5">Updates existing records and adds missing ones. Keeps new data created after the backup.</span>
                </div>
              </label>
              <label className="flex items-start gap-3 cursor-pointer">
                <input 
                  type="radio" 
                  name="restoreMode" 
                  value="reset" 
                  checked={restoreMode === "reset"} 
                  onChange={() => setRestoreMode("reset")} 
                  className="mt-1 w-4 h-4 accent-destructive" 
                />
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-destructive">Destructive Reset (Wipe & Rollback)</span>
                  <span className="text-xs text-muted-foreground mt-0.5">Deletes all current data and restores an exact replica of the backup. New data will be permanently lost.</span>
                </div>
              </label>
            </div>
          </div>
        )}

        {/* SHARED DELTA VISUALIZER */}
        {activeTab !== "transfer" && (
          <div className="flex flex-col gap-3 mt-2 border-t pt-4">
            <button
              type="button"
              onClick={handleDisplayDifferences}
              disabled={isComparing || isPending}
              className="flex items-center gap-2 text-sm font-semibold text-primary underline hover:text-primary/80 disabled:opacity-50 text-left w-fit transition-opacity"
            >
              <IconRefresh className={cn("w-4 h-4", isComparing && "animate-spin")} />
              {isComparing ? "Analyzing schemas..." : "Display Differences"}
            </button>

            {dbDifferences !== null && (
              <div className="max-h-64 overflow-y-auto border rounded-md p-3 bg-muted/30 text-sm flex flex-col gap-2 scrollbar-thin shadow-inner">
                {dbDifferences.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4 italic">
                    Databases are identical.
                  </p>
                ) : (
                  dbDifferences.map((diff, index) => (
                    <div key={index} className="flex justify-between items-start gap-4 border-b border-border/40 pb-2 last:border-0 last:pb-0">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <span className="font-mono text-[11px] bg-secondary px-2 py-1 rounded text-muted-foreground shrink-0">
                          {diff.model}
                        </span>
                        <span className="truncate text-foreground font-medium" title={diff.identifier}>
                          {diff.identifier}
                        </span>
                      </div>
                      <span className={cn(
                        "text-[11px] px-2 py-1 rounded-sm font-semibold shrink-0 uppercase tracking-wider",
                        diff.variant === "warning" && "bg-amber-500/10 text-amber-600 dark:text-amber-400",
                        diff.variant === "danger" && "bg-destructive/10 text-destructive",
                        diff.variant === "info" && "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                      )}>
                        {diff.status}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* Actions Footer */}
        <div className="flex justify-end mt-4">
          <button 
            onClick={handleExecute}
            disabled={isPending}
            className={cn(
              "px-6 py-2.5 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 rounded-md transition-colors",
              isPending && "opacity-50 cursor-not-allowed"
            )}
          >
            {isPending ? "Processing..." : "Execute"}
          </button>
        </div>
      </div>
    </div>
  );
}
