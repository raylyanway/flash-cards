import clsx from "clsx";
import type { ReactNode } from "react";
import s from "./IconButton.module.css";

type Props = {
  icon: ReactNode;
  ariaLabel: string;
  loading?: boolean;
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
};

export function IconButton({
  icon,
  ariaLabel,
  loading = false,
  active = false,
  disabled = false,
  onClick,
}: Props) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      title={ariaLabel}
      className={clsx(s.iconButton, active && s.active)}
      disabled={disabled || loading}
      onClick={onClick}
    >
      {loading ? (
        <span className={s.iconButtonSpinner} />
      ) : (
        <span className={s.iconButtonIcon}>{icon}</span>
      )}
    </button>
  );
}
