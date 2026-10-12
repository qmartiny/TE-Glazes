import type { Combo, Photo, Profile } from '../../types';

// Sample content so demo mode isn't empty. Photos are drawn as SVG
// "test tiles" so nothing needs downloading.

interface TileSpec {
  clay: string;
  base: [string, string]; // first layer, top-to-bottom gradient
  top?: [string, string]; // layer poured over the top
  speckle?: boolean;
}

let tileCount = 0;

function tileSvg({ clay, base, top, speckle }: TileSpec): string {
  const n = tileCount++;
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

const glaze = (name: string, application: string | null = null) => ({ type: 'glaze' as const, name, application });
const slip = (name: string, application: string | null = null) => ({ type: 'slip' as const, name, application });
const oxide = (name: string, application: string | null = null) => ({ type: 'oxide' as const, name, application });

export function demoCombos(): StoredCombo[] {
  return [
    combo({
      id: 'demo-1',
      userId: 'demo-maya',
      title: 'Blue rim tenmoku',
      clay: 'Craft Crank',
      firing: 'reduction',
      layers: [glaze('Tenmoku', 'Dipped'), glaze('Midnight Blue', 'Poured')],
      description:
        'Tenmoku dipped for 3 seconds, then Midnight Blue poured over the top third.\nRuns a lot over tenmoku, so stop it at least 2 cm above the foot!',
      photos: [
        tilePhoto({ clay: '#c9ab86', base: ['#7a3b1d', '#2a1711'], top: ['#5a6fae', '#26336a'], speckle: true }),
        tilePhoto({ clay: '#c9ab86', base: ['#7a3b1d', '#2a1711'], speckle: true }),
      ],
      createdAt: '2026-09-28T18:20:00Z',
    }),
    combo({
      id: 'demo-2',
      userId: 'demo-sam',
      clay: 'Porcelain',
      firing: 'reduction',
      layers: [glaze('Faux Celadon', 'Dipped')],
      description: 'Two quick dips. Pools beautifully in carved lines, great on fluted pieces.',
      photos: [tilePhoto({ clay: '#f4f1ec', base: ['#c3d9c4', '#8db39a'] })],
      createdAt: '2026-09-20T12:00:00Z',
    }),
    combo({
      id: 'demo-3',
      userId: 'demo-sam',
      title: 'Cobalt brushwork',
      clay: 'Special White',
      firing: 'reduction',
      layers: [slip('Blue', 'Brushed'), oxide('Cobalt Oxide', 'Sponged'), glaze('Transparent', 'Dipped')],
      description:
        'Blue slip brushed on leather-hard, cobalt oxide sponged on after bisque and wiped back, then a thin dip of Transparent.',
      photos: [tilePhoto({ clay: '#ece7df', base: ['#d9e1ef', '#9fb2d6'], top: ['#3d56a6', '#1f2f73'] })],
      createdAt: '2026-09-12T09:30:00Z',
    }),
    combo({
      id: 'demo-4',
      userId: 'demo-jo',
      title: 'Snowy black',
      clay: 'Vulcan Medium Black',
      firing: 'reduction',
      layers: [glaze('Matt Black', 'Dipped'), glaze('Shiny White', 'Brushed')],
      description: 'Shiny White brushed thickly on the rim only (2 coats). Breaks blue-white over the black.',
      photos: [tilePhoto({ clay: '#3d3330', base: ['#3a3533', '#1e1b1a'], top: ['#f4f2ee', '#c9d3dc'] })],
      createdAt: '2026-09-02T15:00:00Z',
    }),
    combo({
      id: 'demo-5',
      userId: 'demo-maya',
      clay: 'Flecked Stoneware',
      firing: 'oxidation',
      layers: [glaze('Honey', 'Dipped'), glaze('Mustard', 'Dipped')],
      description: 'Double dip: Honey first, Mustard over the top half. The flecks come through nicely.',
      photos: [tilePhoto({ clay: '#d8c6a8', base: ['#e0a94c', '#9a5a1c'], top: ['#dcb544', '#a07d1d'], speckle: true })],
      createdAt: '2026-08-14T11:00:00Z',
    }),
    combo({
      id: 'demo-6',
      userId: 'demo-jo',
      clay: 'Draycott',
      firing: 'reduction',
      layers: [oxide('Red Iron Oxide', 'Wiped back'), glaze('Oribe', 'Poured')],
      description: 'Red iron oxide wiped back on textured bisque, then a single pour of Oribe. Goes dark where the oxide stays.',
      photos: [tilePhoto({ clay: '#bfa281', base: ['#6f8f55', '#2f4a2c'], speckle: true })],
      createdAt: '2026-07-30T16:45:00Z',
    }),
  ];
}
