import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from "./dialog";

export const Sheet = ({ open, onOpenChange, children }) => (
  <Dialog open={open} onOpenChange={onOpenChange}>{children}</Dialog>
);

export const SheetTrigger = ({ children, ...props }) => (
  <span {...props}>{children}</span>
);

export const SheetContent = React.forwardRef(({ side = "right", className = "", style = {}, children, ...props }, ref) => (
  <DialogContent
    ref={ref}
    style={{
      padding: 0,
      width: 340,
      maxWidth: "90vw",
      height: "100vh",
      borderRadius: 0,
      top: 0,
      right: 0,
      left: "auto",
      bottom: 0,
      position: "fixed",
      transform: `translateX(${side === "right" ? "0" : "-100%"})`,
      animation: `sheet-slide-in-${side} 0.26s cubic-bezier(.4,0,.2,1)`,
      ...style
    }}
    className={"shadow-xl border-l border-gray-200 bg-white " + className}
    {...props}
  >
    {children}
  </DialogContent>
));

export const SheetHeader = DialogHeader;
export const SheetTitle = DialogTitle;
export const SheetDescription = DialogDescription;
export const SheetClose = DialogClose;

// Add keyframes for animation in your global css:
// @keyframes sheet-slide-in-right { from { transform: translateX(110%); } to { transform: translateX(0); } }
// @keyframes sheet-slide-in-left { from { transform: translateX(-110%); } to { transform: translateX(0); } }
