"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils";

function BobbingDots({
  className,
  dots = 3,
  duration = 1,
  ...props
}) {
  const transition = (index) => ({
    duration,
    repeat: Infinity,
    repeatType: "loop",
    delay: index * 0.2,
    ease: "easeInOut",
  });

  return (
    <span
      role="status"
      className={cn("inline-flex items-center gap-[12%]", className)}
      {...props}>
      {Array.from({ length: dots }, (_, index) => (
        <motion.span
          key={index}
          aria-hidden="true"
          initial={{ y: 0 }}
          animate={{ y: [0, "0.625em", 0] }}
          transition={transition(index)}
          className="inline-block aspect-square grow rounded-full bg-current shadow-sm" />
      ))}
      <span className="sr-only">Loading</span>
    </span>
  );
}

export { BobbingDots };
