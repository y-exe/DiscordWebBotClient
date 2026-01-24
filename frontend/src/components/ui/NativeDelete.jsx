"use client";

import { cn } from "../../lib/utils";
import { AnimatePresence, motion as Motion, MotionConfig } from "framer-motion";
import { Check, Trash2, X } from "lucide-react";
import { useState } from "react";

const Button = ({ variant, className, ...props }) => {
    const baseStyle = "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background";
    const variantStyle = variant === 'destructive' 
        ? "bg-red-500 text-white hover:bg-red-600" 
        : "border border-gray-300 dark:border-zinc-700 bg-transparent hover:bg-gray-100 dark:hover:bg-zinc-800";
    return <button className={cn(baseStyle, variantStyle, className)} {...props} />;
};

const sizeVariants = { sm: "h-8 text-xs px-3", md: "h-10 text-sm px-4", lg: "h-12 text-base px-6" };
const iconSizeVariants = { sm: "h-3 w-3", md: "h-4 w-4", lg: "h-5 w-5" };
const cancelButtonSizes = { sm: "h-8 w-8", md: "h-10 w-10", lg: "h-12 w-12" };
const smoothSpring = { type: "spring", bounce: 0, duration: 0.35 };

export function NativeDelete({
  onConfirm = () => {},
  onDelete,
  buttonText = "Delete",
  confirmText = "Confirm",
  size = "md",
  showIcon = true,
  className,
  disabled = false,
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleDeleteClick = () => {
    if (!disabled) { setIsExpanded(true); onConfirm(); }
  };
  const handleConfirm = () => { onDelete(); setIsExpanded(false); };
  const handleCancel = () => { setIsExpanded(false); };

  return (
    <MotionConfig transition={smoothSpring}>
      <Motion.div layout className={cn("relative inline-flex items-center gap-2", className)}>
        <Motion.div layout whileHover={!disabled ? { scale: 1.02 } : {}} whileTap={!disabled ? { scale: 0.98 } : {}}>
          <Button
            variant="destructive"
            className={cn(sizeVariants[size], "cursor-pointer transition-shadow text-white", disabled && "opacity-50 cursor-not-allowed")}
            onClick={isExpanded ? handleConfirm : handleDeleteClick}
            disabled={disabled}
            aria-label={isExpanded ? confirmText : buttonText}
          >
            <AnimatePresence mode="wait" initial={false}>
              {showIcon && (
                <Motion.span key={isExpanded ? "check-icon" : "trash-icon"} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} transition={{ duration: 0.15 }} className="mr-2 flex items-center">
                  {isExpanded ? <Check className={iconSizeVariants[size]} /> : <Trash2 className={iconSizeVariants[size]} />}
                </Motion.span>
              )}
            </AnimatePresence>
            <AnimatePresence mode="wait" initial={false}>
              <Motion.span key={isExpanded ? "confirm" : "delete"} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.15 }}>
                {isExpanded ? confirmText : buttonText}
              </Motion.span>
            </AnimatePresence>
          </Button>
        </Motion.div>
        <AnimatePresence>
          {isExpanded && (
            <Motion.div key="cancel-button" layout initial={{ opacity: 0, scale: 0.8, x: -8 }} animate={{ opacity: 1, scale: 1, x: 0 }} exit={{ opacity: 0, scale: 0.8, x: -8 }} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button variant="outline" size="icon" className={cn(cancelButtonSizes[size], "cursor-pointer transition-shadow")} onClick={handleCancel} aria-label="Cancel delete">
                <X className={iconSizeVariants[size]} />
              </Button>
            </Motion.div>
          )}
        </AnimatePresence>
      </Motion.div>
    </MotionConfig>
  );
}