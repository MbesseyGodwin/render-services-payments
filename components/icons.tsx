// components/icons.tsx

import React from 'react';

export function VisaIcon({ style }: { style?: React.CSSProperties }) {
  return (
    <svg
      width="24"
      height="15"
      viewBox="0 0 36 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'inline-block', flexShrink: 0, ...style }}
    >
      <rect width="36" height="24" rx="3" fill="#0A2540" />
      <path
        d="M14.6 16.5L16.2 7.5H18.7L17.1 16.5H14.6ZM24.6 7.7C24.1 7.5 23.3 7.3 22.4 7.3C19.9 7.3 18.2 8.6 18.2 10.4C18.2 11.8 19.4 12.5 20.3 13C21.2 13.5 21.6 13.8 21.6 14.3C21.6 15 20.7 15.4 19.9 15.4C18.9 15.4 18.3 15.2 17.6 14.9L17.2 14.7L16.8 16.8C17.5 17.1 18.7 17.4 19.9 17.4C22.6 17.4 24.3 16.1 24.3 14.2C24.3 12.5 23.2 11.7 22 11.1C21.3 10.7 20.8 10.4 20.8 9.9C20.8 9.4 21.4 9 22.2 9C23 9 23.7 9.2 24.2 9.4L24.4 9.5L24.6 7.7ZM28.5 7.5H26.5C25.9 7.5 25.4 7.7 25.1 8.3L21.4 16.5H24L24.5 15.1H27.7L28 16.5H30.3L28.5 7.5ZM25.2 13.2C25.4 12.7 26.2 10.5 26.2 10.5C26.2 10.5 26.4 10 26.5 9.7L26.7 10.5C26.7 10.5 27.2 12.6 27.3 13.2H25.2ZM13.3 7.5L10.9 13.7L10.6 12.2C10.3 11 9.2 9.8 8.1 9.2L10.3 16.5H12.9L16.8 7.5H13.3ZM9.4 7.5H6L5.9 7.7C8.2 8.3 10.1 9.6 10.8 11.1L10.1 7.7C9.9 7.5 9.7 7.5 9.4 7.5Z"
        fill="#FFFFFF"
      />
    </svg>
  );
}

export function MastercardIcon({ style }: { style?: React.CSSProperties }) {
  return (
    <svg
      width="24"
      height="15"
      viewBox="0 0 36 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'inline-block', flexShrink: 0, ...style }}
    >
      <rect width="36" height="24" rx="3" fill="#242833" />
      <circle cx="14" cy="12" r="7" fill="#EB001B" />
      <circle cx="22" cy="12" r="7" fill="#F79E1B" />
      <path
        d="M18 7.6C19.2 8.7 20 10.3 20 12C20 13.7 19.2 15.3 18 16.4C16.8 15.3 16 13.7 16 12C16 10.3 16.8 8.7 18 7.6Z"
        fill="#FF5F00"
      />
    </svg>
  );
}

export function AmexIcon({ style }: { style?: React.CSSProperties }) {
  return (
    <svg
      width="24"
      height="15"
      viewBox="0 0 36 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'inline-block', flexShrink: 0, ...style }}
    >
      <rect width="36" height="24" rx="3" fill="#0077A6" />
      <path
        d="M6 15L9.5 9H13L15 15H12.5L12 13.5H9.5L9 15H6ZM10 11.8H11.5L10.8 9.8L10 11.8ZM15 15V9H18.5L20.2 12.2L22 9H25.5V15H23.5V11.2L21.2 15H19.5L17.2 11.2V15H15ZM26.5 15V9H31.5V10.5H28.5V11.2H31V12.7H28.5V13.5H31.5V15H26.5Z"
        fill="#FFFFFF"
      />
    </svg>
  );
}

export function DiscoverIcon({ style }: { style?: React.CSSProperties }) {
  return (
    <svg
      width="24"
      height="15"
      viewBox="0 0 36 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'inline-block', flexShrink: 0, ...style }}
    >
      <rect width="36" height="24" rx="3" fill="#FFFFFF" stroke="#D8E2EC" strokeWidth="1" />
      <circle cx="18" cy="12" r="5" fill="#FF6000" />
      <path d="M8 10H10.5C12 10 13 10.8 13 12C13 13.2 12 14 10.5 14H8V10ZM9.5 12.8H10.5C11.2 12.8 11.6 12.5 11.6 12C11.6 11.5 11.2 11.2 10.5 11.2H9.5V12.8Z" fill="#1A1F36" />
      <path d="M23 10H24.5V14H23V10Z" fill="#1A1F36" />
    </svg>
  );
}

export function CvcIcon({ style }: { style?: React.CSSProperties }) {
  return (
    <svg
      width="18"
      height="12"
      viewBox="0 0 24 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'inline-block', flexShrink: 0, ...style }}
    >
      <rect x="0.5" y="0.5" width="23" height="15" rx="2.5" fill="#FFFFFF" stroke="#8792A2" />
      <rect y="3" width="24" height="3" fill="#8792A2" />
      <rect x="14" y="9" width="7" height="3" rx="1" fill="#D8E2EC" />
      <circle cx="16" cy="10.5" r="0.6" fill="#8792A2" />
      <circle cx="17.5" cy="10.5" r="0.6" fill="#8792A2" />
      <circle cx="19" cy="10.5" r="0.6" fill="#8792A2" />
    </svg>
  );
}

export function DownloadTrayIcon({ style }: { style?: React.CSSProperties }) {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ display: 'inline-block', flexShrink: 0, ...style }}
    >
      <path d="M2.5 10.5v2a1.5 1.5 0 0 0 1.5 1.5h8a1.5 1.5 0 0 0 1.5-1.5v-2" />
      <polyline points="5 7.5 8 10.5 11 7.5" />
      <line x1="8" y1="2" x2="8" y2="10.5" />
    </svg>
  );
}

export function ChevronRightIcon({ style }: { style?: React.CSSProperties }) {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ display: 'inline-block', flexShrink: 0, ...style }}
    >
      <polyline points="6 3 11 8 6 13" />
    </svg>
  );
}

export function CloseIcon({ style }: { style?: React.CSSProperties }) {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ display: 'inline-block', flexShrink: 0, ...style }}
    >
      <line x1="3" y1="3" x2="13" y2="13" />
      <line x1="13" y1="3" x2="3" y2="13" />
    </svg>
  );
}

export function StripeLogo({ style }: { style?: React.CSSProperties }) {
  return (
    <svg
      width="38"
      height="16"
      viewBox="0 0 60 25"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'inline-block', flexShrink: 0, ...style }}
    >
      <path
        d="M59.64 14.28c0-4.48-2.19-8-6.66-8-4.5 0-7.18 3.52-7.18 8 0 5.34 3.19 7.96 7.74 7.96 2.22 0 3.89-.5 5.17-1.22v-3.32c-1.28.67-2.73 1.05-4.45 1.05-1.74 0-3.27-.64-3.5-2.61h8.84c.02-.33.04-.6.04-.86zm-8.87-1.63c.09-1.8 1.25-2.52 2.23-2.52.95 0 2.06.72 2.15 2.52h-4.38zM39.69 6.28h-4.8v15.7h4.8V6.28zm-2.4-6.28c-1.6 0-2.88 1.25-2.88 2.82 0 1.57 1.28 2.82 2.88 2.82s2.88-1.25 2.88-2.82c0-1.57-1.28-2.82-2.88-2.82zM28.02 9.47l-.33-3.19h-4.22v15.7h4.8v-8.91c1.13-1.48 3.03-1.23 3.63-1.04V7.61c-.65-.24-2.73-.65-3.88 1.86zm-11.45 3.3c0-.82.68-1.37 1.76-1.37 1.51 0 3.44.52 4.96 1.34V8.47c-1.63-.69-3.32-.98-4.96-.98-4.04 0-6.73 2.11-6.73 5.65 0 5.48 7.54 4.6 7.54 6.96 0 .97-.84 1.48-2 1.48-1.73 0-3.95-.74-5.69-1.72v4.39c1.94.84 3.93 1.19 5.69 1.19 4.19 0 7.02-2.07 7.02-5.71 0-5.91-7.59-4.82-7.59-6.91zM0 12.77c0-.82.68-1.37 1.76-1.37 1.51 0 3.44.52 4.96 1.34V8.47c-1.63-.69-3.32-.98-4.96-.98C2.68 7.49 0 9.6 0 13.14c0 5.48 7.54 4.6 7.54 6.96 0 .97-.84 1.48-2 1.48-1.73 0-3.95-.74-5.69-1.72v4.39c1.94.84 3.93 1.19 5.69 1.19 4.19 0 7.02-2.07 7.02-5.71 0-5.91-7.59-4.82-7.59-6.91z"
        fill="#8792A2"
      />
    </svg>
  );
}
