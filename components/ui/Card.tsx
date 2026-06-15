import React from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export const Card = ({ children, className }: CardProps) => {
  return (
    <div className={cn("bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden", className)}>
      {children}
    </div>
  );
};

export const CardHeader = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cn("p-6 pb-3", className)}>{children}</div>
);

export const CardContent = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cn("p-6 pt-0", className)}>{children}</div>
);

export const CardFooter = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cn("p-6 pt-0 mt-auto flex items-center justify-between", className)}>{children}</div>
);

