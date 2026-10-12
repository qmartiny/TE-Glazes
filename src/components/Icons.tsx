import type { SVGProps } from 'react';

function Icon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    />
  );
}

export const GridIcon = () => (
  <Icon>
    <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
    <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
    <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
    <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
  </Icon>
);

export const PlusIcon = () => (
  <Icon>
    <path d="M12 5v14M5 12h14" />
  </Icon>
);

export const UserIcon = () => (
  <Icon>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 20c1.5-3.5 4.5-5 8-5s6.5 1.5 8 5" />
  </Icon>
);

export const CameraIcon = () => (
  <Icon>
    <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
    <circle cx="12" cy="13" r="3.5" />
  </Icon>
);

export const CloseIcon = () => (
  <Icon width="16" height="16">
    <path d="M6 6l12 12M18 6L6 18" />
  </Icon>
);

export const UpIcon = () => (
  <Icon width="18" height="18">
    <path d="M6 15l6-6 6 6" />
  </Icon>
);

export const DownIcon = () => (
  <Icon width="18" height="18">
    <path d="M6 9l6 6 6-6" />
  </Icon>
);

export const ShareIcon = () => (
  <Icon width="18" height="18">
    <path d="M12 3v12M7 8l5-5 5 5M5 13v7h14v-7" />
  </Icon>
);

export const LockIcon = () => (
  <Icon width="14" height="14">
    <rect x="5" y="11" width="14" height="9" rx="2" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </Icon>
);

/** A little glazed bowl, used as the logo. */
export const Logo = () => (
  <svg viewBox="0 0 32 32" width="28" height="28" aria-hidden="true">
    <path d="M4 13h24c0 7-5.4 12-12 12S4 20 4 13z" fill="var(--clay)" />
    <path d="M4 13h24c0 2.6-.8 4.9-2.1 6.8-1.3-1.2-2.4.9-3.6-.2-1.2-1.1-2.3 1.7-3.8.5-1.4-1.1-2.6 1.3-4 .1-1.3-1.1-2.5 1-3.7-.1C5.6 18 4 15.7 4 13z" fill="var(--accent)" />
    <ellipse cx="16" cy="13" rx="12" ry="3" fill="var(--accent-strong)" />
  </svg>
);
