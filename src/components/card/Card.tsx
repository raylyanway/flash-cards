import clsx from "clsx";
import type { HTMLAttributes } from "react";
import s from "./Card.module.css";

type Props = HTMLAttributes<HTMLDivElement>;

export function Card({ children, className, ...props }: Props) {
  return (
    <div {...props} className={clsx(s.card, className)}>
      {children}
    </div>
  );
}
