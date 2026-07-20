import { useAppStore } from "../../store/useAppStore";
import s from "./AppHeader.module.css";

export function AppHeader() {
  const currentSet = useAppStore((state) => state.currentSet);

  return (
    <header>
      <div className={s.currentSet}>
        <span className={s.setLabel}>Current set</span>
        <strong>{currentSet}</strong>
      </div>
    </header>
  );
}
