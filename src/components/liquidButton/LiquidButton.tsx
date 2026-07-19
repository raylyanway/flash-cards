import s from "./LiquidButton.module.css";

type Props = {
  ariaLabel: string;
  loading?: boolean;
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
};

export function LiquidButton({
  ariaLabel,
  loading = false,
  // active = false,
  disabled = false,
  onClick,
}: Props) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      title={ariaLabel}
      className={s.button}
      disabled={disabled || loading}
      onClick={onClick}
    >
      <span className={s.label}>Hover me</span>
      <div className={s.wave}></div>
    </button>
  );
}
