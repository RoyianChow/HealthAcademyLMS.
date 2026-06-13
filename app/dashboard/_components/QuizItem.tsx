import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ClipboardList } from "lucide-react";
import Link from "next/link";

interface iAppProps {
  quiz: {
    id: string;
    title: string;
  };
  isActive?: boolean;
  isPassed: boolean;
}

export function QuizItem({ quiz, isActive, isPassed }: iAppProps) {
  return (
    <Link
      href={`/quizzes/${quiz.id}`}
      className={buttonVariants({
        variant: isPassed ? "secondary" : "outline",
        className: cn(
          "w-full p-2.5 h-auto justify-start transition-all",
          isPassed &&
            "bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700 hover:bg-green-200 dark:hover:bg-green-900/50 text-green-800 dark:text-green-200",
          isActive &&
            !isPassed &&
            "bg-primary/10 dark:bg-primary/20 border-primary/50 hover:bg-primary/20 dark:hover:bg-primary/30 text-primary",
          !isActive && !isPassed && "hover:bg-muted" 
        ),
      })}
    >
      <div className="flex items-center gap-2.5 w-full min-w-0">
        <div className="w-5 flex items-center justify-center shrink-0">
          <ClipboardList
            className={cn(
              "size-4",
              isActive
                ? "text-primary"
                : isPassed
                  ? "text-green-600 dark:text-green-500"
                  : "text-muted-foreground"
            )}
          />
        </div>

        <div className="flex-1 text-left min-w-0">
          <p
            className={cn(
              "text-xs font-medium truncate",
              isPassed
                ? "text-green-800 dark:text-green-200"
                : isActive
                  ? "text-primary font-semibold"
                  : "text-foreground"
            )}
          >
            {quiz.title}
          </p>
          {isPassed && (
            <p className="text-[10px] text-green-700 dark:text-green-300 font-medium">
              Completed
            </p>
          )}

          {isActive && !isPassed && (
            <p className="text-[10px] text-primary font-medium">
              Currently Taking
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}
