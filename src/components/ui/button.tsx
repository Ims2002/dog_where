import Link from "next/link";
import type { ComponentProps } from "react";

import { cn } from "./cn";

type Variant = "signal" | "ink" | "outline" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-md font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50";

const variants: Record<Variant, string> = {
  signal: "bg-signal text-on-signal border-2 border-on-signal hover:bg-signal-strong",
  ink: "bg-on-signal text-signal hover:opacity-90",
  outline: "border-2 border-ink text-ink hover:bg-ink/5",
  ghost: "text-ink underline-offset-4 hover:underline",
  danger: "border-2 border-danger text-danger hover:bg-danger/10",
};

const sizes: Record<Size, string> = {
  sm: "min-h-10 px-3 text-sm",
  md: "px-4 text-base",
  lg: "px-6 text-lg",
};

type StyleProps = { variant?: Variant; size?: Size };

export function buttonClasses({ variant = "signal", size = "md" }: StyleProps = {}) {
  return cn(base, variants[variant], sizes[size]);
}

export function Button({
  variant,
  size,
  className,
  type = "button",
  ...props
}: ComponentProps<"button"> & StyleProps) {
  return (
    <button type={type} className={cn(buttonClasses({ variant, size }), className)} {...props} />
  );
}

export function ButtonLink({
  variant,
  size,
  className,
  ...props
}: ComponentProps<typeof Link> & StyleProps) {
  return <Link className={cn(buttonClasses({ variant, size }), className)} {...props} />;
}
