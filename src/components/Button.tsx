import { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "deep" | "glass"; // Figma: Default #4f46e5, Variant2 #09045c
};
export default function Button({ variant = "primary", className = "", ...rest }: Props) {
  return <button className={`btn btn--${variant} ${className}`} {...rest} />;
}
