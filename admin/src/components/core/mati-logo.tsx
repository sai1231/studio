import { Brain } from 'lucide-react';
import type React from 'react';

interface MatiLogoProps {
  className?: string;
  iconSize?: number;
  textSize?: string;
}

const MatiLogo: React.FC<MatiLogoProps> = ({ className, iconSize = 24, textSize = "text-2xl" }) => {
  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <Brain size={iconSize} className="text-primary" />
      <h1 className={`font-headline font-semibold text-primary ${textSize}`}>Mati</h1>
    </div>
  );
};

export default MatiLogo;
