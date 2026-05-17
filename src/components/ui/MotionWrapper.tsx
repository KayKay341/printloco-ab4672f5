import { motion } from "framer-motion";
import React from "react";

export const MotionWrapper = ({ children, className, as: Component = "div" }: { children: React.ReactNode, className?: string, as?: React.ElementType }) => {
  const MotionComponent = motion(Component as any);
  
  return (
    <MotionComponent
      className={className}
      whileHover={{ scale: 1.02, rotateY: 2, rotateX: 2 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      style={{ transformStyle: "preserve-3d" }}
    >
      {children}
    </MotionComponent>
  );
};
