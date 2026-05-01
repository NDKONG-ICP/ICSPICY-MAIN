import { cn } from "@/lib/utils";
import { Slot } from "@radix-ui/react-slot";
import { type VariantProps, cva } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium transition-smooth disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        /** Fire-red primary — main CTAs */
        primary:
          "bg-primary text-primary-foreground shadow-subtle hover:bg-primary/90 active:scale-[0.98]",
        /** Subdued secondary */
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        /** Transparent — nav items, icon buttons */
        ghost: "hover:bg-secondary hover:text-foreground text-muted-foreground",
        /** Destructive — delete / cancel actions */
        danger:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        /** Outlined */
        outline:
          "border border-border bg-transparent text-foreground hover:bg-secondary",
        /** Text link style */
        link: "text-primary underline-offset-4 hover:underline p-0 h-auto",
      },
      size: {
        xs: "h-7 px-2.5 text-xs rounded",
        sm: "h-8 px-3 text-sm",
        md: "h-10 px-4 text-sm",
        lg: "h-11 px-6 text-base",
        xl: "h-12 px-8 text-base",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { buttonVariants };
