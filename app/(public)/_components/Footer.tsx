'use client';

import Link from "next/link";

export function Footer() {
  return (
    <footer className="w-full bg-[#f7f7f3] border-t border-neutral-200 px-6 py-10 md:px-10 lg:px-16 mt-auto">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Navigation Links */}
        <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm text-neutral-600">
          <Link href="/about" className="hover:text-neutral-900 transition-colors">
            About
          </Link>
          <Link href="/contact" className="hover:text-neutral-900 transition-colors">
            Contact Us
          </Link>
          <Link href="/legal" className="hover:text-neutral-900 transition-colors">
            Legal Disclaimer
          </Link>
        </div>

        {/* Divider Line */}
        <div className="h-[1px] w-full bg-neutral-200" />

        {/* Bottom Row */}
        <div className="flex items-center justify-between text-xs text-neutral-500">
          <p>© 2026 Happy Nutrition LTD</p>
          
          {/* Instagram Link Button */}
          <a 
            href="https://instagram.com" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="p-1.5 border border-neutral-300 rounded-md hover:bg-neutral-200 transition-colors text-neutral-600"
            aria-label="Instagram"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
              <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
              <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
            </svg>
          </a>
        </div>
      </div>
    </footer>
  );
}
