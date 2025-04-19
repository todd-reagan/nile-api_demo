'use client';

import Link from 'next/link';

interface ReturnToDevicesProps {
  className?: string;
}

export default function ReturnToDevices({ className = '' }: ReturnToDevicesProps) {
  return (
    <Link 
      href="/devices.html" 
      className={`text-gray-300 hover:text-white transition-colors duration-200 ${className}`}
    >
      Return to Devices
    </Link>
  );
}
