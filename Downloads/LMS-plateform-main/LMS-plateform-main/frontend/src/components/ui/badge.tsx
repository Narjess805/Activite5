import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.22em] transition-colors focus:outline-none focus:ring-2 focus:ring-ring/35 focus:ring-offset-0",
  {
    variants: {
      variant: {
        default: "border-primary/15 bg-primary/12 text-primary",
        secondary: "border-white/80 bg-white/90 text-secondary-foreground",
        destructive: "border-destructive/15 bg-destructive/10 text-destructive",
        outline: "border-white/80 bg-card/70 text-foreground",
        success: "border-emerald-200 bg-emerald-50 text-emerald-800",
        warning: "border-amber-200 bg-amber-50 text-amber-800",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
