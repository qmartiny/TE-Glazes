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
  'chevron_right',
  'close',
  'delete',
  'edit',
  'error',
  'grid_on',
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
  'verified',
  'water_drop',
  'zoom_in',
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
