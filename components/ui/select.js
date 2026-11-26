"use client";

import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";

export function Select({ value, onValueChange, children }) {
  return <SelectPrimitive.Root value={value} onValueChange={onValueChange}>{children}</SelectPrimitive.Root>;
}

export function SelectTrigger({ id, className = "", children, ...props }) {
  return <SelectPrimitive.Trigger id={id} className={`ui-select-trigger ${className}`.trim()} {...props}>{children}<SelectPrimitive.Icon className="ui-select-icon"><ChevronDown aria-hidden="true" /></SelectPrimitive.Icon></SelectPrimitive.Trigger>;
}

export function SelectValue(props) {
  return <SelectPrimitive.Value {...props} />;
}

export function SelectContent({ children, ...props }) {
  return <SelectPrimitive.Portal><SelectPrimitive.Content className="ui-select-content" position="popper" sideOffset={5} {...props}><SelectPrimitive.Viewport className="ui-select-viewport">{children}</SelectPrimitive.Viewport></SelectPrimitive.Content></SelectPrimitive.Portal>;
}

export function SelectItem({ value, children, ...props }) {
  return <SelectPrimitive.Item value={value} className="ui-select-item" {...props}><SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText><SelectPrimitive.ItemIndicator className="ui-select-indicator"><Check aria-hidden="true" /></SelectPrimitive.ItemIndicator></SelectPrimitive.Item>;
}