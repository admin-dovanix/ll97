import type { ButtonHTMLAttributes } from "react";
import { Button } from "./button";

export function ActionButton(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <Button {...props} />;
}
