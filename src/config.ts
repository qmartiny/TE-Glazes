// ---------------------------------------------------------------------------
// Studio settings. Edit these lists to match your studio — they drive the
// dropdowns on the "Add combo" form and the filters on the browse page.
// People can always type a value that isn't in a list ("Other…").
// ---------------------------------------------------------------------------

export const APP_NAME = 'Glaze Book';

// Your Supabase project (Project Settings → API Keys). The publishable / anon
// key is meant to be public: the database's access rules protect the data.
// Set the key to '' to run in demo mode instead.
export const SUPABASE_URL = 'https://ctdctrnaapynovtwkikl.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable__YtJahehrqHV0QO8ZMzIJA_nC1RIZVK';

export const STUDIOS: string[] = ['Hoxton', 'Leyton', 'Highgate'];

export const CLAYS: string[] = [
  'Reclaim',
  'Craft Crank',
  'Lavafleck',
  'Draycott',
  'Flecked Stoneware',
  'White Grogged',
  'Staffordshire',
  'Premium Sanded Buff',
  'Special White',
  'Porcelain',
  'Sibelco Black',
  'Vulcan Medium Black',
  'Vulcan Coarse Black',
  'Oxidising St Thomas',
];

export const GLAZES: string[] = [
  'Shiny White',
  'Cotton',
  'Satin Cream',
  'Matt Transparent',
  'Transparent',
  'Bruised Peach',
  'Blush Rutile',
  'Faux Celadon',
  'Midnight Blue',
  'Delia Duck',
  'Noriko Nori',
  'Monet Blue',
  'Mustard',
  'Honey',
  'Tenmoku',
  'Mushroom',
  'Sea Green',
  'Oribe',
  'Gustav Grey',
  'Gray Blue',
  'Matt Black',
  'Lavender',
  'Sakura',
  'Matcha',
];

export const SLIPS: string[] = ['Yellow', 'Blue', 'Brown', 'White', 'Black'];

export const OXIDES: string[] = [
  'Red Iron Oxide',
  'Black Iron Oxide',
  'Cobalt Oxide',
  'Copper Oxide',
  'Manganese Oxide',
];

export const APPLICATIONS: string[] = [
  'Dipped',
  'Poured',
  'Brushed',
  'Sprayed',
  'Sponged',
  'Trailed',
  'Wiped back',
];

// Kiln type. Stored as the firing atmosphere (electric kilns fire in
// oxidation, gas kilns in reduction); people only see the kiln names.
// New combos default to the first one.
export const FIRINGS = [
  { value: 'oxidation', label: 'Electric kiln' },
  { value: 'reduction', label: 'Gas kiln' },
] as const;

export const MAX_PHOTOS = 6;
export const PAGE_SIZE = 24;
