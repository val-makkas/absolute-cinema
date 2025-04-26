import * as React from "react";

export const ExtensionIcon = ({ size = 22, color = "currentColor", ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <rect x="3" y="3" width="7" height="7" rx="2" stroke={color} strokeWidth="2"/>
    <rect x="3" y="14" width="7" height="7" rx="2" stroke={color} strokeWidth="2"/>
    <rect x="14" y="3" width="7" height="7" rx="2" stroke={color} strokeWidth="2"/>
    <rect x="14" y="14" width="7" height="7" rx="2" stroke={color} strokeWidth="2"/>
  </svg>
);