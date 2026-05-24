import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    isOptional?: boolean;
    description?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, label='', isOptional=false, description='', ...props }, ref) => {
    return (
        <div className={cn(
            "space-y-2 focus-within:bg-input-focus focus-within:ring-1 focus-within:ring-primary",
            (label?.trim() ? "border border-border p-3" : "border-none p-0")
        )}>
            {label?.trim() && (
                <div>
                    <p className="text-xs font-medium mb-0.5">
                        {label} {isOptional ? (<span className="text-muted-foreground">(optional)</span>) : ''}
                    </p>
                    {description?.trim() && (
                        <p className="text-[11px] text-muted-foreground leading-snug">
                            {description}
                        </p>
                    )}
                </div>
            )}
            <input
                type={type}
                className={cn(
                    "flex h-9 w-full border border-input bg-input px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
                    className
                )}
                ref={ref}
                {...props}
            />
        </div>
    );
  }
);
Input.displayName = "Input";

export { Input };
