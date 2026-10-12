import type { Combo, Photo, Profile } from '../../types';

// Sample content so demo mode isn't empty. Photos are drawn as SVG
// "test tiles" so nothing needs downloading.

interface TileSpec {
  clay: string;
  glazes: string[]; // first = base layer
  speckle?: boolean;
}

const COLORS: Record<string, [string, string]> = {
  Tenmoku: ['#7a3b1d', '#2a1711'],
  'Chun Blue': ['#b6cde0', '#7f9fbe'],
  Celadon: ['#c3d9c4', '#8db39a'],
  Shino: ['#ecd2b4', '#d0855a'],
  'Satin Black': ['#3a3533', '#1e1b1a'],
  Nuka: ['#f1ede4', '#c9d0d6'],
  Honey: ['#e0a94c', '#9a5a1c'],
  'Kaki / Iron Red': ['#a5532a', '#6b2a15'],
  'Matt White': ['#f3efe7', '#ddd5c8'],
  'Copper Red': ['#b2333a', '#5e1418'],
};

let tileCount = 0;

function tileSvg({ clay, glazes, speckle }: TileSpec): string {
  const n = tileCount++;
  const [base, top] = glazes.map((g) => COLORS[g] ?? ['#ddd', '#bbb']);
  const second = top
    ? `<path clip-path="url(#c${n})" fill="url(#g2${n})" d="M220 40H580V230Q560 262 540 236Q528 330 514 336Q500 326 492 246Q462 268 432 238Q420 300 408 304Q396 298 390 248Q352 270 318 236Q304 286 292 290Q280 284 274 246Q248 262 220 234Z"/>`
    : '';
  const grad2 = top
    ? `<linearGradient id="g2${n}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${top[0]}"/><stop offset="1" stop-color="${top[1]}"/></linearGradient>`
    : '';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">
<defs>
<linearGradient id="bg${n}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ebe5dc"/><stop offset="1" stop-color="#d6cdbf"/></linearGradient>
<linearGradient id="g1${n}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${base[0]}"/><stop offset="1" stop-color="${base[1]}"/></linearGradient>
${grad2}
<linearGradient id="sh${n}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity=".35"/><stop offset=".35" stop-color="#fff" stop-opacity="0"/></linearGradient>
<clipPath id="c${n}"><rect x="220" y="40" width="360" height="520" rx="26"/></clipPath>
<filter id="sp${n}"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="1" seed="${n}"/><feColorMatrix values="0 0 0 0 .15 0 0 0 0 .1 0 0 0 0 .08 0 0 0 -2.2 1.25"/><feComposite in2="SourceGraphic" operator="in"/></filter>
</defs>
<rect width="800" height="600" fill="url(#bg${n})"/>
<ellipse cx="400" cy="566" rx="200" ry="16" fill="#000" opacity=".12"/>
<rect x="220" y="40" width="360" height="520" rx="26" fill="${clay}"/>
<path clip-path="url(#c${n})" fill="url(#g1${n})" d="M220 40H580V452Q520 470 470 456Q440 488 420 486Q400 470 380 458Q300 476 220 450Z"/>
${second}
${speckle ? `<rect x="220" y="40" width="360" height="520" rx="26" fill="#000" filter="url(#sp${n})" clip-path="url(#c${n})"/>` : ''}
<rect x="220" y="40" width="360" height="520" rx="26" fill="url(#sh${n})"/>
<circle cx="400" cy="104" r="22" fill="#d6cdbf" stroke="#0002" stroke-width="2"/>
</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function tilePhoto(spec: TileSpec): Photo {
  const url = tileSvg(spec);
  return { path: url, thumb: url, width: 800, height: 600 };
}

export const DEMO_PROFILES: Profile[] = [
  { id: 'demo-maya', displayName: 'Maya', studio: 'Hoxton', bio: 'Mostly mugs and big bowls.', createdAt: '2026-03-02T10:00:00Z' },
  { id: 'demo-sam', displayName: 'Sam', studio: 'Leyton', bio: 'Porcelain and carving.', createdAt: '2026-04-11T10:00:00Z' },
  { id: 'demo-jo', displayName: 'Jo', studio: 'Hoxton', bio: null, createdAt: '2026-05-20T10:00:00Z' },
];

type StoredCombo = Omit<Combo, 'author'>;

function combo(c: Omit<StoredCombo, 'updatedAt' | 'isPrivate' | 'title'> & Partial<StoredCombo>): StoredCombo {
  return { title: null, isPrivate: false, updatedAt: c.createdAt, ...c };
}

export function demoCombos(): StoredCombo[] {
  return [
    combo({
      id: 'demo-1',
      userId: 'demo-maya',
      title: 'Blue rim tenmoku',
      clay: 'Buff stoneware',
      firing: 'reduction',
      studio: 'Hoxton',
      layers: [
        { glaze: 'Tenmoku', application: 'Dipped' },
        { glaze: 'Chun Blue', application: 'Poured' },
      ],
      description:
        'Tenmoku dipped for 3 seconds, then Chun Blue poured over the top third.\nChun runs a lot over tenmoku — stop it at least 2 cm above the foot!',
      photos: [
        tilePhoto({ clay: '#cdb391', glazes: ['Tenmoku', 'Chun Blue'] }),
        tilePhoto({ clay: '#cdb391', glazes: ['Tenmoku'] }),
      ],
      createdAt: '2026-09-28T18:20:00Z',
    }),
    combo({
      id: 'demo-2',
      userId: 'demo-sam',
      clay: 'Porcelain',
      firing: 'reduction',
      studio: 'Leyton',
      layers: [{ glaze: 'Celadon', application: 'Dipped' }],
      description: 'Two quick dips. Pools beautifully in carved lines — great on fluted pieces.',
      photos: [tilePhoto({ clay: '#f4f1ec', glazes: ['Celadon'] })],
      createdAt: '2026-09-20T12:00:00Z',
    }),
    combo({
      id: 'demo-3',
      userId: 'demo-jo',
      title: 'Snowy black',
      clay: 'Dark / black stoneware',
      firing: 'reduction',
      studio: 'Hoxton',
      layers: [
        { glaze: 'Satin Black', application: 'Dipped' },
        { glaze: 'Nuka', application: 'Brushed' },
      ],
      description: 'Nuka brushed thickly on the rim only (2 coats). Breaks to a soft blue-white over the black.',
      photos: [tilePhoto({ clay: '#3d3330', glazes: ['Satin Black', 'Nuka'] })],
      createdAt: '2026-09-12T09:30:00Z',
    }),
    combo({
      id: 'demo-4',
      userId: 'demo-maya',
      clay: 'Speckled stoneware',
      firing: 'oxidation',
      studio: 'Hoxton',
      layers: [
        { glaze: 'Honey', application: 'Dipped' },
        { glaze: 'Kaki / Iron Red', application: 'Dipped' },
      ],
      description: 'Double dip — honey first, kaki over the top half. Speckles come through nicely in oxidation.',
      photos: [tilePhoto({ clay: '#d8c6a8', glazes: ['Honey', 'Kaki / Iron Red'], speckle: true })],
      createdAt: '2026-08-30T15:00:00Z',
    }),
    combo({
      id: 'demo-5',
      userId: 'demo-sam',
      clay: 'Smooth white stoneware',
      firing: 'reduction',
      studio: 'Leyton',
      layers: [
        { glaze: 'Matt White', application: 'Dipped' },
        { glaze: 'Copper Red', application: 'Sprayed' },
      ],
      description: 'Light spray of copper red over matt white. Thin = pink, thick = deep red. Top shelf of the kiln went greener.',
      photos: [tilePhoto({ clay: '#ece7df', glazes: ['Matt White', 'Copper Red'] })],
      createdAt: '2026-08-14T11:00:00Z',
    }),
    combo({
      id: 'demo-6',
      userId: 'demo-jo',
      clay: 'Grogged / crank stoneware',
      firing: 'reduction',
      studio: 'Hoxton',
      layers: [{ glaze: 'Shino', application: 'Poured' }],
      description: 'Single pour, quite thick. Lovely carbon trapping on the crank.',
      photos: [tilePhoto({ clay: '#bfa281', glazes: ['Shino'], speckle: true })],
      createdAt: '2026-07-30T16:45:00Z',
    }),
  ];
}
