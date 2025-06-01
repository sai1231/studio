
import { Brain } from 'lucide-react'; // Changed from Zap to Brain
import type React from 'react';

interface MatiLogoProps { // Renamed interface
  className?: string;
  iconSize?: number;
  textSize?: string;
}

const MatiLogo: React.FC<MatiLogoProps> = ({ className, iconSize = 24, textSize = "text-2xl" }) => { // Renamed component
  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <Brain size={iconSize} className="text-primary" />
      <h1 className={`font-headline font-semibold text-primary ${textSize}`}>Mati</h1> {/* Changed Klipped to Mati */}
    </div>
  );
};

export default MatiLogo; // Renamed export
