// Material Symbols (Rounded), loaded from Google Fonts in index.html. Only the
// icons listed here are downloaded: when you use a new one, add it to ICONS
// and to the `icon_names` list in index.html (a test checks they match).
export const ICONS = [
  'account_circle',
  'add',
  'add_a_photo',
  'arrow_back',
  'arrow_downward',
  'arrow_drop_down',
  'arrow_upward',
  'check',
  'close',
  'delete',
  'edit',
  'error',
  'grid_view',
  'local_fire_department',
  'lock',
  'login',
  'logout',
  'palette',
  'photo_library',
  'science',
  'search',
  'search_off',
  'settings',
  'share',
  'texture',
  'water_drop',
] as const;

export type IconName = (typeof ICONS)[number];

interface Props {
  name: IconName;
  filled?: boolean;
  className?: string;
}

export function Icon({ name, filled, className }: Props) {
  const classes = ['icon', filled && 'icon-filled', className].filter(Boolean).join(' ');
  return (
    <span className={classes} aria-hidden="true">
      {name}
    </span>
  );
}

/** A little glazed bowl, used as the logo. */
export function Logo() {
  return (
    <svg viewBox="0 0 32 32" width="28" height="28" aria-hidden="true" className="logo">
      <path d="M4 13h24c0 7-5.4 12-12 12S4 20 4 13z" fill="var(--logo-clay)" />
      <path
        d="M4 13h24c0 2.6-.8 4.9-2.1 6.8-1.3-1.2-2.4.9-3.6-.2-1.2-1.1-2.3 1.7-3.8.5-1.4-1.1-2.6 1.3-4 .1-1.3-1.1-2.5 1-3.7-.1C5.6 18 4 15.7 4 13z"
        fill="var(--logo-glaze)"
      />
      <ellipse cx="16" cy="13" rx="12" ry="3" fill="var(--logo-rim)" />
    </svg>
  );
}
