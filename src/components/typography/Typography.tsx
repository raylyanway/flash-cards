import clsx from "clsx";
import type { ElementType, HTMLAttributes } from "react";
import s from "./Typography.module.css";

type TypographyVariant = "title" | "subtitle" | "caption" | "label";

type Props = HTMLAttributes<HTMLElement> & {
  as?: ElementType;
  variant?: TypographyVariant;
};

export function Typography({
  as: Component = "p",
  variant = "title",
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

export function Title({
  as: Component = "h1",
  className,
  children,
  ...props
}: Props) {
  return (
    <Component {...props} className={clsx(s.typography, className)}>
      {children}
    </Component>
  );
}

export function Subtitle({
  as: Component = "h2",
  className,
  children,
  ...props
}: Props) {
  return (
    <Component {...props} className={clsx(s.typography, s.subtitle, className)}>
      {children}
    </Component>
  );
}

export function Caption({
  as: Component = "span",
  className,
  children,
  ...props
}: Props) {
  return (
    <Component {...props} className={clsx(s.typography, s.caption, className)}>
      {children}
    </Component>
  );
}

export function Label({
  as: Component = "span",
  className,
  children,
  ...props
}: Props) {
  return (
    <Component {...props} className={clsx(s.typography, s.label, className)}>
      {children}
    </Component>
  );
}
