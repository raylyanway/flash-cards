import { useAppStore } from "../../store/useAppStore";
import s from "./SelectedSet.module.css";

export function SelectedSet() {
  const currentSet = useAppStore((state) => state.currentSet);

  return (
    <div className={s.currentSet}>
      <span className={s.setLabel}>Current set</span>
      <strong>{currentSet}</strong>
    </div>
  );
}
