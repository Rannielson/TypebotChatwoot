import * as React from "react"
import { cn } from "@/lib/utils"

export interface SwitchProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  ({ className, checked = false, onCheckedChange, ...props }, ref) => {
    return (
      <label className={cn("relative inline-flex items-center cursor-pointer", className)}>
        <input
          type="checkbox"
          ref={ref}
          checked={checked}
          onChange={(e) => onCheckedChange?.(e.target.checked)}
          className="sr-only"
          {...props}
        />
        <div
          className={cn(
            "relative w-11 h-6 rounded-full transition-colors duration-200 ease-in-out",
            checked ? "bg-green-500" : "bg-gray-300"
          )}
        >
          <div
            className={cn(
              "absolute top-[2px] left-[2px] bg-white rounded-full h-5 w-5 shadow-[0_1px_3px_rgba(0,0,0,0.2)] transition-transform duration-200 ease-in-out",
              checked ? "translate-x-5" : "translate-x-0"
            )}
          />
        </div>
      </label>
    );
  }
)
Switch.displayName = "Switch"

export { Switch }
