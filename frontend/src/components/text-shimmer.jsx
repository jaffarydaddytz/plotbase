"use client";;
import React, { useMemo } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

function TextShimmerComponent({
  children,
  as: Component = "p",
  className,
  duration = 2,
  spread = 2,
  baseColor,
  shimmerColor,
  style
}) {
  const MotionComponent = motion.create(
    Component,
  );

  const dynamicSpread = useMemo(() => {
    return children.length * spread;
  }, [children, spread]);

  return (
    <MotionComponent
      className={cn(
        "relative inline-block bg-size-[250%_100%,auto] bg-clip-text",
        "[-webkit-text-fill-color:transparent]",
        "[background-repeat:no-repeat,padding-box] [--bg:linear-gradient(90deg,#0000_calc(50%-var(--spread)),var(--base-gradient-color),#0000_calc(50%+var(--spread)))]",
        className,
      )}
      initial={{ backgroundPosition: "100% center" }}
      animate={{ backgroundPosition: "0% center" }}
      transition={{
        repeat: Infinity,
        duration,
        ease: "linear",
      }}
      style={
        {
          ...style,
          "--spread": `${dynamicSpread}px`,

          "--base-color":
            baseColor ?? "color-mix(in oklab, currentColor 55%, transparent)",

          "--base-gradient-color": shimmerColor ?? "currentColor",
          backgroundImage: `var(--bg), linear-gradient(var(--base-color), var(--base-color))`
        }
      }
    >
      {children}
    </MotionComponent>
  );
}

export const TextShimmer = React.memo(TextShimmerComponent);
