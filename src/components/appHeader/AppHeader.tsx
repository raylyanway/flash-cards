import { useAppStore } from "../../store/useAppStore";
import { IconButton } from "../iconButton";
import {
  AnalyticsIcon,
  HomeIcon,
  MicrophoneIcon,
  NextIcon,
  ResetIcon,
  SettingsIcon,
  SpeakerIcon,
} from "../Icons";
import { LiquidButton } from "../liquidButton";
import s from "./AppHeader.module.css";

type AppHeaderProps = {
  onOpenSettings: () => void;
};

export function AppHeader({ onOpenSettings }: AppHeaderProps) {
  const currentSet = useAppStore((state) => state.currentSet);

  return (
    <header>
      <div className={s.currentSet}>
        <span className={s.setLabel}>Current set:</span>
        <strong>{currentSet}</strong>
      </div>
      <div className={s.headerActions}>
        <IconButton
          icon={<SettingsIcon />}
          ariaLabel="Settings"
          onClick={onOpenSettings}
        />
        <IconButton
          icon={<HomeIcon />}
          ariaLabel="Home"
          onClick={onOpenSettings}
        />
        <IconButton
          icon={<AnalyticsIcon />}
          ariaLabel="Analytics"
          onClick={onOpenSettings}
        />
        <IconButton
          icon={<MicrophoneIcon />}
          ariaLabel="Settings"
          onClick={onOpenSettings}
        />
        <IconButton
          icon={<SpeakerIcon />}
          ariaLabel="Settings"
          onClick={onOpenSettings}
        />
        <IconButton
          icon={<NextIcon />}
          ariaLabel="Settings"
          onClick={onOpenSettings}
        />
        <IconButton
          icon={<ResetIcon />}
          ariaLabel="Settings"
          onClick={onOpenSettings}
        />
        <LiquidButton ariaLabel="start" />
      </div>
    </header>
  );
}
