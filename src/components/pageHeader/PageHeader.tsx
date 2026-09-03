import type { ReactNode } from "react";
import s from "./PageHeader.module.css";

type Props = {
  icon: ReactNode;
  title: string;
  description: string;
};

export function PageHeader({ icon, title, description }: Props) {
  return (
    <div className={s.wrapper}>
      <div className={s.icon}>{icon}</div>
      <div>
        {title ? <h1>{title}</h1> : null}
        {description ? <p>{description}</p> : null}
      </div>
    </div>
  );
}
