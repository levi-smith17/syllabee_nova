import * as React from "react"
import * as SwitchPrimitive from "@radix-ui/react-switch"
import { cn } from "@/lib/utils"

export interface SwitchProps extends React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root> {
  label?: string;
  description?: string;
}

const Switch = React.forwardRef<React.ElementRef<typeof SwitchPrimitive.Root>, SwitchProps>((
    { className, checked, label='', description='', ...props }, ref) => (
    <label className={cn('flex items-start gap-3 border p-3 cursor-pointer transition-colors',
        checked ? 'border-primary bg-muted-selected' : 'border-border hover:bg-muted-hover')}>
        <SwitchPrimitive.Root
            ref={ref}
            className={cn(
                "peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input",
                className
            )}
            checked={checked}
            {...props}
        >
            <SwitchPrimitive.Thumb
                className={cn(
                    "pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0"
                )}
            />
        </SwitchPrimitive.Root>
        <div>
            <p className="text-xs font-medium mb-0.5">{label}</p>
            <p className="text-[11px] text-muted-foreground leading-snug">{description}</p>
        </div>
    </label>
))
Switch.displayName = SwitchPrimitive.Root.displayName

export { Switch }
