import React from "react"
import { cn } from "@/lib/utils"

type TypographyVariant =
  | "h1"
  | "h2"
  | "h3"
  | "subtitle"
  | "eyebrow"
  | "body"
  | "body-sm";

type TypographyProps = {
  as?: React.ElementType;
  variant?: TypographyVariant;
  className?: string;
  children: React.ReactNode;
};

const variantClassMap: Record<TypographyVariant, string> = {
  h1: "tk-h1",
  h2: "tk-h2",
  h3: "tk-h3",
  subtitle: "tk-subtitle",
  eyebrow: "tk-eyebrow",
  body: "tk-body",
  "body-sm": "tk-body-sm",
};

export function Typography({
  as,
  variant = "body",
  className,
  children,
}: TypographyProps) {
  const Component = as || defaultElementForVariant(variant);
  const variantClasses = variantClassMap[variant];

  return (
    <Component className={cn(variantClasses, className)}>
      {children}
    </Component>
  );
}

function defaultElementForVariant(variant: TypographyVariant): keyof JSX.IntrinsicElements {
  switch (variant) {
    case "h1":
      return "h1";
    case "h2":
      return "h2";
    case "h3":
      return "h3";
    case "eyebrow":
      return "p";
    case "subtitle":
      return "p";
    case "body":
    case "body-sm":
    default:
      return "p";
  }
}

