import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4ea1ff]/60 disabled:pointer-events-none disabled:opacity-60",
  {
    variants: {
      variant: {
        default: "border border-[#2f81f7] bg-[#2f81f7] text-white hover:bg-[#1f6feb]",
        outline: "border border-[#30363d] bg-[#161b22] text-[#e6edf3] hover:border-[#4ea1ff] hover:text-[#4ea1ff]",
        ghost: "text-[#9ba7b4] hover:bg-[#161b22] hover:text-[#e6edf3]"
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 rounded-md px-3",
        lg: "h-11 rounded-md px-8"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, ...props }, ref) => (
  <button className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
));

Button.displayName = "Button";

export { Button, buttonVariants };
