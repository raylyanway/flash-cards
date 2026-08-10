import clsx from "clsx";
import type { ReactNode } from "react";
import s from "./PageHeader.module.css";

type Props = {
  icon?: ReactNode;
  eyebrow?: string;
  title?: string;
  description?: string;
  className?: string;
};

export function PageHeader({
  icon,
  eyebrow,
  title,
  description,
  className,
}: Props) {
  return (
    <div className={clsx(s.pageHeading, className)}>
      {icon ? <div className={s.headingIcon}>{icon}</div> : null}
      <div>
        {eyebrow ? <p className={s.eyebrow}>{eyebrow}</p> : null}
        {title ? <h1>{title}</h1> : null}
        {description ? <p>{description}</p> : null}
      </div>
    </div>
  );
}
