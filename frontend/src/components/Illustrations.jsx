import React from 'react';

/**
 * High-definition vector illustrations matching the design mockups.
 */

export const RobotIllustration = () => (
  <svg viewBox="0 0 500 450" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full max-w-md drop-shadow-2xl">
    <defs>
      <linearGradient id="purpleBg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#818CF8" stopOpacity="0.25"/>
        <stop offset="100%" stopColor="#C084FC" stopOpacity="0.1"/>
      </linearGradient>
      <linearGradient id="robotBody" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FFFFFF"/>
        <stop offset="100%" stopColor="#E0E7FF"/>
      </linearGradient>
      <linearGradient id="primaryGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#6366F1"/>
        <stop offset="100%" stopColor="#4F46E5"/>
      </linearGradient>
      <linearGradient id="screenGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#1E1B4B"/>
        <stop offset="100%" stopColor="#312E81"/>
      </linearGradient>
      <filter id="shadowFilter" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="12" stdDeviation="16" floodColor="#4338CA" floodOpacity="0.2"/>
      </filter>
    </defs>

    {/* Background soft aura */}
    <circle cx="250" cy="225" r="180" fill="url(#purpleBg)" filter="blur(20px)"/>

    {/* Floating decorative elements */}
    <circle cx="100" cy="110" r="10" fill="#818CF8" opacity="0.6"/>
    <circle cx="410" cy="130" r="14" fill="#C084FC" opacity="0.6"/>
    <circle cx="390" cy="320" r="8" fill="#6366F1" opacity="0.4"/>
    <path d="M70 240 L85 240 M77.5 232.5 L77.5 247.5" stroke="#A5B4FC" strokeWidth="3" strokeLinecap="round"/>
    <path d="M420 220 L435 220 M427.5 212.5 L427.5 227.5" stroke="#C084FC" strokeWidth="3" strokeLinecap="round"/>

    {/* Table / Base */}
    <ellipse cx="250" cy="380" rx="160" ry="24" fill="#E2E8F0" opacity="0.6"/>
    <ellipse cx="250" cy="375" rx="130" ry="16" fill="#CBD5E1" opacity="0.4"/>

    {/* Open Book */}
    <g transform="translate(140, 310)">
      <path d="M0 30 Q40 15 70 30 Q100 15 140 30 L135 50 Q100 35 70 50 Q40 35 0 50 Z" fill="#EEF2FF"/>
      <path d="M70 30 L70 50" stroke="#4F46E5" strokeWidth="2"/>
      {/* Book pages lines */}
      <line x1="20" y1="35" x2="60" y2="35" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round"/>
      <line x1="20" y1="41" x2="55" y2="41" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round"/>
      <line x1="80" y1="35" x2="120" y2="35" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round"/>
      <line x1="80" y1="41" x2="115" y2="41" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round"/>
    </g>

    {/* Laptop */}
    <g transform="translate(265, 270)" filter="url(#shadowFilter)">
      {/* Screen */}
      <rect x="0" y="0" width="85" height="55" rx="6" fill="#1E293B"/>
      <rect x="5" y="5" width="75" height="45" rx="4" fill="url(#screenGrad)"/>
      {/* Code lines on screen */}
      <rect x="12" y="14" width="30" height="3" rx="1.5" fill="#818CF8"/>
      <rect x="12" y="22" width="45" height="3" rx="1.5" fill="#38BDF8"/>
      <rect x="12" y="30" width="25" height="3" rx="1.5" fill="#34D399"/>
      {/* Base keyboard */}
      <path d="M-15 55 L100 55 L90 70 L-5 70 Z" fill="#CBD5E1"/>
      <rect x="25" y="60" width="35" height="4" rx="2" fill="#94A3B8"/>
    </g>

    {/* Robot Character */}
    <g transform="translate(180, 110)" filter="url(#shadowFilter)">
      {/* Mortarboard Hat */}
      <g transform="translate(45, -15)">
        <polygon points="25,0 65,15 25,30 -15,15" fill="#312E81"/>
        <polygon points="25,4 60,16 25,27 -10,16" fill="#4338CA"/>
        <rect x="15" y="24" width="20" height="12" rx="3" fill="#1E1B4B"/>
        {/* Tassel */}
        <circle cx="25" cy="15" r="3" fill="#FBBF24"/>
        <path d="M25 15 C35 18, 48 30, 46 45" stroke="#FBBF24" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
        <rect x="43" y="44" width="6" height="10" rx="2" fill="#F59E0B"/>
      </g>

      {/* Head */}
      <rect x="20" y="25" width="100" height="75" rx="28" fill="url(#robotBody)"/>
      <rect x="22" y="27" width="96" height="71" rx="26" stroke="#C7D2FE" strokeWidth="2"/>

      {/* Ears / Antennas */}
      <rect x="8" y="50" width="12" height="24" rx="6" fill="#6366F1"/>
      <rect x="120" y="50" width="12" height="24" rx="6" fill="#6366F1"/>

      {/* Face Screen */}
      <rect x="32" y="38" width="76" height="48" rx="18" fill="url(#screenGrad)"/>

      {/* Friendly Glowing Eyes */}
      <ellipse cx="54" cy="60" rx="8" ry="10" fill="#38BDF8"/>
      <circle cx="56" cy="57" r="3" fill="#FFFFFF"/>
      <ellipse cx="86" cy="60" rx="8" ry="10" fill="#38BDF8"/>
      <circle cx="88" cy="57" r="3" fill="#FFFFFF"/>

      {/* Smile */}
      <path d="M64 74 Q70 79 76 74" stroke="#38BDF8" strokeWidth="2.5" strokeLinecap="round" fill="none"/>

      {/* Body */}
      <rect x="35" y="105" width="70" height="70" rx="22" fill="url(#robotBody)"/>
      <rect x="48" y="120" width="44" height="34" rx="10" fill="#EEF2FF"/>
      {/* Chest Logo Heart/AI icon */}
      <path d="M70 132 C70 128, 64 125, 60 129 C56 133, 70 144, 70 144 C70 144, 84 133, 80 129 C76 125, 70 128, 70 132 Z" fill="#6366F1"/>

      {/* Arms */}
      {/* Left arm reading book */}
      <path d="M35 125 Q5 145 20 185" stroke="#CBD5E1" strokeWidth="14" strokeLinecap="round" fill="none"/>
      <circle cx="20" cy="185" r="9" fill="#818CF8"/>

      {/* Right arm typing on laptop */}
      <path d="M105 125 Q135 145 125 180" stroke="#CBD5E1" strokeWidth="14" strokeLinecap="round" fill="none"/>
      <circle cx="125" cy="180" r="9" fill="#818CF8"/>
    </g>
  </svg>
);

export const ResetRequestIllustration = () => (
  <svg viewBox="0 0 400 350" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full max-w-sm drop-shadow-xl">
    <defs>
      <linearGradient id="envGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#818CF8"/>
        <stop offset="100%" stopColor="#4F46E5"/>
      </linearGradient>
      <linearGradient id="paperGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FFFFFF"/>
        <stop offset="100%" stopColor="#F8FAFC"/>
      </linearGradient>
    </defs>

    {/* Background Circle */}
    <circle cx="200" cy="175" r="140" fill="#EEF2FF" opacity="0.6"/>

    {/* Envelope Body */}
    <g transform="translate(100, 110)">
      {/* Paper sticking out */}
      <rect x="25" y="0" width="150" height="110" rx="8" fill="url(#paperGrad)" filter="drop-shadow(0 4px 6px rgba(0,0,0,0.06))"/>
      <line x1="45" y1="30" x2="110" y2="30" stroke="#CBD5E1" strokeWidth="4" strokeLinecap="round"/>
      <line x1="45" y1="45" x2="155" y2="45" stroke="#CBD5E1" strokeWidth="4" strokeLinecap="round"/>
      <line x1="45" y1="60" x2="135" y2="60" stroke="#CBD5E1" strokeWidth="4" strokeLinecap="round"/>

      {/* Envelope front pouch */}
      <path d="M0 45 L100 115 L200 45 L200 160 C200 168 193 175 185 175 L15 175 C7 175 0 168 0 160 Z" fill="#6366F1"/>
      <path d="M0 160 L80 95 M200 160 L120 95" stroke="#4F46E5" strokeWidth="3"/>
      
      {/* Front seal / badge */}
      <circle cx="100" cy="115" r="22" fill="#4F46E5" stroke="#FFFFFF" strokeWidth="3"/>
      <path d="M92 115 L98 121 L108 109" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
    </g>

    {/* Flying Paper Plane */}
    <g transform="translate(250, 70) rotate(-15)">
      <polygon points="0,30 65,0 20,45" fill="url(#envGrad)"/>
      <polygon points="20,45 65,0 45,45" fill="#818CF8"/>
      {/* Trail */}
      <path d="M-40 45 Q-20 40 0 30" stroke="#818CF8" strokeWidth="2.5" strokeDasharray="4 4" fill="none"/>
    </g>
  </svg>
);

export const ResetConfirmIllustration = () => (
  <svg viewBox="0 0 400 350" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full max-w-sm drop-shadow-xl">
    <defs>
      <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#6366F1"/>
        <stop offset="100%" stopColor="#4F46E5"/>
      </linearGradient>
      <linearGradient id="successGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#10B981"/>
        <stop offset="100%" stopColor="#059669"/>
      </linearGradient>
    </defs>

    {/* Background Circle */}
    <circle cx="200" cy="175" r="140" fill="#EEF2FF" opacity="0.6"/>

    {/* Main Shield */}
    <g transform="translate(130, 70)">
      <path d="M70 10 C120 10, 140 40, 140 90 C140 160, 70 200, 70 200 C70 200, 0 160, 0 90 C0 40, 20 10, 70 10 Z" fill="url(#shieldGrad)"/>
      <path d="M70 22 C110 22, 126 48, 126 90 C126 150, 70 185, 70 185 C70 185, 14 150, 14 90 C14 48, 30 22, 70 22 Z" fill="#FFFFFF" fillOpacity="0.15"/>

      {/* Lock in center */}
      <g transform="translate(48, 70)">
        {/* Shackle */}
        <path d="M12 25 L12 16 C12 6, 32 6, 32 16 L32 25" stroke="#FFFFFF" strokeWidth="5" strokeLinecap="round" fill="none"/>
        {/* Lock Body */}
        <rect x="0" y="22" width="44" height="34" rx="8" fill="#FFFFFF"/>
        {/* Keyhole */}
        <circle cx="22" cy="36" r="4" fill="#4F46E5"/>
        <path d="M22 38 L22 45" stroke="#4F46E5" strokeWidth="3" strokeLinecap="round"/>
      </g>
    </g>

    {/* Success Check Badge 1 */}
    <g transform="translate(245, 120)">
      <circle cx="20" cy="20" r="18" fill="url(#successGrad)" stroke="#FFFFFF" strokeWidth="3"/>
      <path d="M13 20 L18 25 L27 15" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
    </g>

    {/* Success Check Badge 2 */}
    <g transform="translate(230, 225)">
      <circle cx="22" cy="22" r="20" fill="url(#successGrad)" stroke="#FFFFFF" strokeWidth="3"/>
      <path d="M14 22 L20 28 L30 16" stroke="#FFFFFF" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
    </g>
  </svg>
);
