import { Zap } from 'lucide-react';
import type React from 'react';

interface KlippedLogoProps {
  className?: string;
  iconSize?: number;
  textSize?: string;
}

const KlippedLogo: React.FC<KlippedLogoProps> = ({ className, iconSize = 24, textSize = "text-2xl" }) => {
  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <Zap size={iconSize} className="text-primary" />
      <h1 className={`font-headline font-semibold text-primary ${textSize}`}>Klipped</h1>
    </div>
  );
};

export default KlippedLogo;
