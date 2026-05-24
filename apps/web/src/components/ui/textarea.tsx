import * as React from "react"
import { cn } from "@/lib/utils"

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    label?: string;
    isOptional?: boolean;
    description?: string;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label='', isOptional=false, description='', ...props }, ref) => (
      <div className="border border-border p-3 space-y-2 focus-within:bg-input-focus focus-within:ring-1 focus-within:ring-primary">
          <div>
              <p className="text-xs font-medium mb-0.5">{label} {isOptional ? (<span className="text-muted-foreground">(optional)</span>) : ''}</p>
              {description?.trim() && (
                  <p className="text-[11px] text-muted-foreground leading-snug">
                      {description}
                  </p>
              )}
          </div>
          <textarea
              className={cn(
                "flex min-h-15 w-full rounded-md border border-input bg-input px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
                className
              )}
              ref={ref}
              {...props}
          />
      </div>
  )
)
Textarea.displayName = "Textarea"

export { Textarea }
