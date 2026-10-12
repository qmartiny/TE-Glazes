// ---------------------------------------------------------------------------
// Studio settings. Edit these lists to match your studio — they drive the
// dropdowns on the "Add combo" form and the filters on the browse page.
// People can always type a value that isn't in a list ("Other…").
// ---------------------------------------------------------------------------

export const APP_NAME = 'TE Glazes';
export const APP_TAGLINE = 'What the studio glazes look like together, shared by members';

// Your Supabase project (Project Settings → API Keys). The publishable / anon
// key is meant to be public: the database's access rules protect the data.
// While the key is empty the site runs in demo mode.
export const SUPABASE_URL = 'https://ctdctrnaapynovtwkikl.supabase.co';
export const SUPABASE_ANON_KEY = '';

export const STUDIOS: string[] = ['Hoxton', 'Leyton', 'Tottenham', 'Highgate'];

export const CLAYS: string[] = [
  'Smooth white stoneware',
  'Buff stoneware',
  'Speckled stoneware',
  'Grogged / crank stoneware',
  'Dark / black stoneware',
  'Red stoneware',
  'Porcelain',
  'Earthenware (terracotta)',
];

// Placeholder list — replace with the studio's actual glaze names.
export const GLAZES: string[] = [
  'Clear',
  'Satin White',
  'Matt White',
  'Celadon',
  'Chun Blue',
  'Shino',
  'Tenmoku',
  'Kaki / Iron Red',
  'Honey',
  'Nuka',
  'Copper Red',
  'Satin Black',
];

export const APPLICATIONS: string[] = ['Dipped', 'Poured', 'Brushed', 'Sprayed', 'Sponged', 'Trailed'];

export const FIRINGS = [
  { value: 'reduction', label: 'Reduction' },
  { value: 'oxidation', label: 'Oxidation' },
] as const;

export const MAX_PHOTOS = 6;
export const PAGE_SIZE = 24;
