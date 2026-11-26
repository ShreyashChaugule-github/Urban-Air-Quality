"use client";

import * as SliderPrimitive from "@radix-ui/react-slider";

export function Slider({ className = "", value, min, max, step = 1, onValueChange, ...props }) {
  return <SliderPrimitive.Root className={`ui-slider ${className}`.trim()} value={value} min={min} max={max} step={step} onValueChange={onValueChange} {...props}>
    <SliderPrimitive.Track className="ui-slider-track"><SliderPrimitive.Range className="ui-slider-range" /></SliderPrimitive.Track>
    <SliderPrimitive.Thumb className="ui-slider-thumb" />
  </SliderPrimitive.Root>;
}