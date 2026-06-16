import React, { useId } from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, ...props }, ref) => {
    const generatedId = useId();
    const id = props.id || generatedId;

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label htmlFor={id} className="text-xs font-bold text-gray-400 uppercase tracking-wider">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          className={cn(
            "flex h-9 w-full rounded-lg border border-gray-300 bg-white px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-red-500 focus-visible:ring-red-600",
            className
          )}
          {...props}
        />
        {error && (
          <p className="text-xs text-red-500 font-medium">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

