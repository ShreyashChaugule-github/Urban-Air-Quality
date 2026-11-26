import { forwardRef } from "react";

const Input = forwardRef(function Input({ className = "", type = "text", ...props }, ref) {
  return <input ref={ref} type={type} className={`ui-input ${className}`.trim()} {...props} />;
});

export { Input };