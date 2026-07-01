import s from "./IconButton.module.css";
import clsx from "clsx";


type Props = {
  icon: string;
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
      className={clsx("icon-button", active && "active")}
      disabled={disabled || loading}
      onClick={onClick}
    >
      {loading ? (
        <span className={s.iconButtonSpinner} />
      ) : (
        <span className="icon-button__icon">{icon}</span>
      )}
    </button>
  );
}
