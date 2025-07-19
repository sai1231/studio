
import React from 'react';
import { cn } from '@/lib/utils';

const PdfIcon = ({ className, ...props }: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={cn("h-12 w-12", className)}
    {...props}
  >
    <path d="M14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8L14 2Z" fill="hsl(var(--primary))"/>
    <path d="M14 2V8H20" fill="hsl(var(--accent))" fillOpacity="0.5"/>
    <text x="50%" y="65%" dominantBaseline="middle" textAnchor="middle" fontFamily="sans-serif" fontSize="6.5" fontWeight="bold" fill="hsl(var(--primary-foreground))">
      PDF
    </text>
  </svg>
);

export default PdfIcon;
