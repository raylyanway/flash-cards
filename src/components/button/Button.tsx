import clsx from "clsx";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import s from "./Button.module.css";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  iconPosition?: "start" | "end";
  loading?: boolean;
  active?: boolean;
};

export function Button({
  children,
  className,
  variant = "primary",
  size = "md",
  icon,
  iconPosition = "start",
  loading = false,
  active = false,
  disabled = false,
  type = "button",
  ...props
}: Props) {
  const isDisabled = disabled || loading;

  return (
    <button
      {...props}
      type={type}
      className={clsx(
        s.button,
        s[variant],
        s[size],
        active && s.active,
        loading && s.loading,
        className,
      )}
      disabled={isDisabled}
      aria-busy={loading || undefined}
    >
      {loading && <span className={s.spinner} aria-hidden="true" />}
      {!loading && icon && iconPosition === "start" && (
        <span className={s.icon}>{icon}</span>
      )}
      <span className={s.label}>{children}</span>
      {!loading && icon && iconPosition === "end" && (
        <span className={s.icon}>{icon}</span>
      )}
    </button>
  );
}
