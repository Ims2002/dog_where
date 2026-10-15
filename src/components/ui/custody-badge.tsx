import { CUSTODY_LABEL, type CustodyStatus } from "@/features/posts/constants";

import { cn } from "./cn";

const styles: Record<CustodyStatus, string> = {
  with_finder: "bg-finder",
  at_shelter: "bg-shelter",
  not_caught: "bg-loose",
};

/** Indica dónde está el animal ahora. El color refuerza, el texto informa. */
export function CustodyBadge({
  custody,
  className,
}: {
  custody: CustodyStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "dark:text-street inline-flex items-center gap-1.5 rounded-sm px-2 py-0.5 text-sm font-bold text-white",
        styles[custody],
        className,
      )}
    >
      {CUSTODY_LABEL[custody]}
    </span>
  );
}
