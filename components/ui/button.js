import { forwardRef } from "react";

const Button = forwardRef(function Button({ className = "", variant = "default", size = "default", type = "button", ...props }, ref) {
  return <button ref={ref} type={type} className={`ui-button ui-button-${variant} ui-button-${size} ${className}`.trim()} {...props} />;
});

export { Button };