export function Badge({ className = "", variant = "secondary", ...props }) {
  return <span className={`ui-badge ui-badge-${variant} ${className}`.trim()} {...props} />;
}