
import type React from 'react';

interface MatiLogoProps {
  className?: string;
  iconSize?: number;
  textSize?: string;
}

const MatiLogo: React.FC<MatiLogoProps> = ({ className, iconSize = 24, textSize = "text-2xl" }) => {
  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="text-primary"
      >
        <circle cx="12" cy="12" r="12" fill="currentColor"/>
        <path d="M6.05266 17.5V6.5H7.73687V11.2368C7.73687 11.2368 9.31582 8.42105 12 8.42105C14.6842 8.42105 16.2632 11.2368 16.2632 11.2368V6.5H17.9474V17.5H16.2632V12.9211C16.2632 12.9211 15.0527 10.6579 12 10.6579C8.94739 10.6579 7.73687 12.9211 7.73687 12.9211V17.5H6.05266Z" fill="#000000"/>
      </svg>
      <h1 className={`font-headline font-semibold text-primary ${textSize}`}>Mati</h1>
    </div>
  );
};

export default MatiLogo;
