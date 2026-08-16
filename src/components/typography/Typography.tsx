import clsx from "clsx";
import type { ElementType, HTMLAttributes } from "react";
import s from "./Typography.module.css";

type TypographyVariant =
  | "display"
  | "h1"
  | "h2"
  | "title"
  | "subtitle"
  | "body"
  | "bodyStrong"
  | "caption"
  | "label"
  | "nav"
  | "metric";

type Props = HTMLAttributes<HTMLElement> & {
  as?: ElementType;
  variant?: TypographyVariant;
};

export function Typography({
  as: Component = "p",
  variant = "body",
  className,
  children,
  ...props
}: Props) {
  return (
    <Component {...props} className={clsx(s.typography, s[variant], className)}>
      {children}
    </Component>
  );
}
