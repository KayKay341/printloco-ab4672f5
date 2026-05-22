import React from "react";

export const MotionWrapper = ({ children, className, as: Component = "div" }: { children: React.ReactNode, className?: string, as?: React.ElementType }) => {
  return <Component className={className}>{children}</Component>;
};

