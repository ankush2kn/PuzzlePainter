import type { TemplateItem } from "@/types/studio";
import { CANVAS_HEIGHT, CANVAS_WIDTH } from "@/lib/constants";

const vb = `0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`;

function wrap(inner: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" fill="none" stroke="#1a1a1a" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
}

export const TEMPLATES: TemplateItem[] = [
  {
    id: "blank",
    name: "Blank Canvas",
    theme: "blank",
    svg: wrap(""),
  },
  {
    id: "kitty-cupcake",
    name: "Kitty Cupcake",
    theme: "animals",
    svg: wrap(`
      <ellipse cx="408" cy="720" rx="160" ry="40" stroke-width="2.5"/>
      <path d="M280 700 Q280 520 320 480 Q360 450 408 450 Q456 450 496 480 Q536 520 536 700"/>
      <path d="M320 480 Q340 400 380 380 Q408 370 436 380 Q476 400 496 480" />
      <circle cx="370" cy="520" r="14"/>
      <circle cx="446" cy="520" r="14"/>
      <path d="M390 560 Q408 575 426 560" />
      <path d="M408 560 L408 590 M395 585 Q408 600 421 585" />
      <path d="M340 400 L300 340 M340 400 L320 330" />
      <path d="M476 400 L516 340 M476 400 L496 330" />
      <path d="M300 700 Q260 640 250 580" />
      <path d="M516 700 Q556 640 566 580" />
      <circle cx="250" cy="560" r="28"/>
      <path d="M230 545 L235 530 M250 540 L250 522 M270 545 L265 530" />
      <circle cx="200" cy="280" r="50"/>
      <path d="M160 250 L155 210 M200 240 L200 195 M240 250 L245 210" />
      <circle cx="620" cy="220" r="8"/><circle cx="650" cy="260" r="5"/><circle cx="580" cy="250" r="6"/>
    `),
  },
  {
    id: "rocket-stars",
    name: "Rocket Ride",
    theme: "space",
    svg: wrap(`
      <path d="M408 120 Q460 220 460 420 L460 620 Q460 680 408 720 Q356 680 356 620 L356 420 Q356 220 408 120Z"/>
      <circle cx="408" cy="400" r="42"/>
      <circle cx="408" cy="400" r="22"/>
      <line x1="408" y1="378" x2="408" y2="422"/>
      <line x1="386" y1="400" x2="430" y2="400"/>
      <path d="M356 560 L280 680 L356 640Z"/>
      <path d="M460 560 L536 680 L460 640Z"/>
      <path d="M370 720 Q390 800 408 780 Q426 800 446 720"/>
      <path d="M385 740 Q408 820 431 740"/>
      <path d="M160 180 A40 40 0 1 1 160 181" />
      <circle cx="200" cy="300" r="4"/><circle cx="240" cy="250" r="3"/>
      <circle cx="620" cy="200" r="4"/><circle cx="580" cy="280" r="3"/>
      <circle cx="650" cy="350" r="5"/><circle cx="180" cy="450" r="3"/>
      <circle cx="600" cy="500" r="4"/><circle cx="220" cy="550" r="3"/>
      <path d="M600 700 L620 740 L640 700 L620 660Z" stroke-width="2.5"/>
      <path d="M180 650 L195 680 L210 650 L195 620Z" stroke-width="2.5"/>
    `),
  },
  {
    id: "ice-cream",
    name: "Ice Cream Stack",
    theme: "food",
    svg: wrap(`
      <path d="M300 520 L408 900 L516 520Z"/>
      <line x1="340" y1="600" x2="380" y2="600"/>
      <line x1="360" y1="680" x2="420" y2="680"/>
      <line x1="380" y1="760" x2="440" y2="760"/>
      <circle cx="340" cy="480" r="70"/>
      <circle cx="408" cy="430" r="75"/>
      <circle cx="476" cy="480" r="70"/>
      <circle cx="408" cy="340" r="55"/>
      <path d="M390 290 Q408 250 426 290"/>
      <circle cx="408" cy="270" r="12"/>
      <circle cx="200" cy="300" r="40"/>
      <path d="M180 280 Q200 240 220 280"/>
      <circle cx="620" cy="350" r="8"/><circle cx="650" cy="400" r="5"/>
      <path d="M150 700 Q200 680 180 750" stroke-width="2.5"/>
      <path d="M600 650 Q650 630 630 700" stroke-width="2.5"/>
    `),
  },
  {
    id: "soccer-fun",
    name: "Ball Pit Party",
    theme: "balls",
    svg: wrap(`
      <circle cx="280" cy="380" r="90"/>
      <path d="M280 290 L310 340 L280 380 L250 340Z"/>
      <path d="M220 350 L250 400 L220 450"/>
      <path d="M340 350 L310 400 L340 450"/>
      <path d="M250 450 L280 420 L310 450"/>
      <circle cx="480" cy="320" r="70"/>
      <line x1="480" y1="250" x2="480" y2="390"/>
      <path d="M430 300 Q480 280 530 300"/>
      <path d="M430 350 Q480 370 530 350"/>
      <circle cx="380" cy="560" r="80"/>
      <path d="M340 520 Q380 500 420 520 Q400 560 380 560 Q360 560 340 520"/>
      <circle cx="560" cy="580" r="55"/>
      <path d="M560 525 L575 555 L560 580 L545 555Z"/>
      <ellipse cx="408" cy="820" rx="220" ry="50"/>
      <path d="M200 820 Q250 760 300 820"/>
      <path d="M350 820 Q400 750 450 820"/>
      <path d="M500 820 Q550 770 600 820"/>
      <circle cx="180" cy="200" r="6"/><circle cx="620" cy="180" r="8"/>
      <circle cx="650" cy="280" r="5"/>
    `),
  },
  {
    id: "scooter-star",
    name: "Sparkle Scooter",
    theme: "vehicles",
    svg: wrap(`
      <circle cx="260" cy="720" r="55"/>
      <circle cx="260" cy="720" r="22"/>
      <circle cx="560" cy="720" r="55"/>
      <circle cx="560" cy="720" r="22"/>
      <path d="M260 720 L260 560 L500 560 L560 720"/>
      <path d="M260 560 L260 420 L300 380"/>
      <circle cx="300" cy="360" r="28"/>
      <path d="M220 420 L300 420"/>
      <path d="M500 560 L500 480 Q520 450 560 460"/>
      <circle cx="200" cy="280" r="45"/>
      <path d="M175 250 L170 210 M200 240 L200 200 M225 250 L230 210"/>
      <circle cx="185" cy="275" r="5"/><circle cx="215" cy="275" r="5"/>
      <path d="M190 295 Q200 305 210 295"/>
      <path d="M408 200 L430 250 L408 240 L386 250Z"/>
      <circle cx="500" cy="220" r="6"/><circle cx="550" cy="260" r="4"/>
      <circle cx="600" cy="200" r="5"/><circle cx="650" cy="300" r="7"/>
      <path d="M150 500 Q180 480 170 530" stroke-width="2.5"/>
      <path d="M620 500 Q660 470 650 540" stroke-width="2.5"/>
    `),
  },
  {
    id: "butterfly-garden",
    name: "Butterfly Garden",
    theme: "animals",
    svg: wrap(`
      <ellipse cx="300" cy="360" rx="70" ry="100"/>
      <ellipse cx="300" cy="360" rx="50" ry="70"/>
      <ellipse cx="516" cy="360" rx="70" ry="100"/>
      <ellipse cx="516" cy="360" rx="50" ry="70"/>
      <ellipse cx="408" cy="380" rx="22" ry="90"/>
      <circle cx="408" cy="290" r="18"/>
      <path d="M395 275 L380 250 M421 275 L436 250"/>
      <circle cx="200" cy="560" r="35"/>
      <circle cx="200" cy="620" r="45"/>
      <line x1="200" y1="665" x2="200" y2="780"/>
      <path d="M200 700 L160 740 M200 720 L240 760"/>
      <circle cx="550" cy="600" r="40"/>
      <path d="M530 580 Q550 540 570 580"/>
      <path d="M520 600 Q500 620 520 640 Q550 660 580 640 Q600 620 580 600 Q550 580 520 600"/>
      <circle cx="650" cy="200" r="8"/><circle cx="150" cy="220" r="6"/>
      <circle cx="180" cy="400" r="4"/><circle cx="620" cy="450" r="5"/>
      <path d="M100 850 Q200 800 300 850 Q400 900 500 850 Q600 800 700 860" stroke-width="2.5"/>
      <path d="M350 780 L360 720 L380 780 M360 740 L375 740" stroke-width="2.5"/>
    `),
  },
  {
    id: "happy-dino",
    name: "Happy Dino",
    theme: "animals",
    svg: wrap(`
      <path d="M226 292 Q218 240 258 216 Q300 194 344 210 Q384 226 388 268 Q390 306 366 332 Q336 358 292 352 Q244 344 226 292Z"/>
      <path d="M268 348 Q296 440 322 500 Q344 550 376 580"/>
      <path d="M372 336 Q416 420 448 478 Q472 520 508 545"/>
      <path d="M376 580 Q342 616 338 670 Q336 722 366 758 Q374 764 376 772 L372 840 Q371 858 392 858 L428 858 Q446 858 445 840 L443 792 Q472 802 504 798 L508 842 Q508 858 528 858 L564 858 Q582 858 581 840 L577 786 Q630 772 656 726 Q668 700 668 672 Q720 680 746 650 Q768 624 760 594 Q755 576 740 572 Q736 580 734 588 Q728 606 706 616 Q686 624 660 616 Q668 574 626 556 Q574 532 508 545"/>
      <path d="M394 858 q6 -10 12 0 M410 858 q6 -10 12 0 M426 858 q6 -10 12 0" stroke-width="2.5"/>
      <path d="M530 858 q6 -10 12 0 M546 858 q6 -10 12 0 M562 858 q6 -10 12 0" stroke-width="2.5"/>
      <path d="M398 388 A18 18 0 0 1 426 428"/>
      <path d="M438 454 A18 18 0 0 1 464 492"/>
      <path d="M484 514 A18 18 0 0 1 518 542"/>
      <path d="M548 536 A18 18 0 0 1 584 538"/>
      <path d="M600 545 A16 16 0 0 1 630 559"/>
      <circle cx="294" cy="270" r="16"/>
      <circle cx="297" cy="273" r="6.5"/>
      <path d="M280 248 L272 236 M292 243 L289 230 M304 244 L308 232" stroke-width="2.5"/>
      <circle cx="310" cy="306" r="9" stroke-width="2.5"/>
      <path d="M248 296 Q264 316 288 308"/>
      <circle cx="244" cy="274" r="3.5" stroke-width="2.5"/>
      <path d="M382 594 Q354 680 396 748" stroke-width="2.5"/>
      <path d="M402 698 Q440 712 476 702 M396 738 Q438 754 482 744" stroke-width="2.5"/>
      <circle cx="556" cy="650" r="16"/>
      <circle cx="602" cy="706" r="11"/>
      <circle cx="502" cy="592" r="11"/>
      <circle cx="404" cy="470" r="9"/>
      <circle cx="352" cy="188" r="7" stroke-width="2.5"/>
      <circle cx="352" cy="172" r="7" stroke-width="2.5"/>
      <circle cx="366" cy="182" r="7" stroke-width="2.5"/>
      <circle cx="361" cy="198" r="7" stroke-width="2.5"/>
      <circle cx="343" cy="198" r="7" stroke-width="2.5"/>
      <circle cx="338" cy="182" r="7" stroke-width="2.5"/>
      <circle cx="660" cy="160" r="45"/>
      <path d="M660 100 L660 78 M710 128 L728 116 M718 168 L740 172 M700 202 L714 220 M614 196 L598 212 M606 132 L588 118" stroke-width="2.5"/>
      <circle cx="646" cy="152" r="4" stroke-width="2.5"/>
      <circle cx="674" cy="152" r="4" stroke-width="2.5"/>
      <path d="M644 174 Q660 188 676 174" stroke-width="2.5"/>
      <path d="M106 168 Q92 138 124 132 Q130 106 162 112 Q180 92 206 104 Q234 104 234 134 Q254 146 240 168 Q175 180 106 168Z"/>
      <path d="M474 258 Q444 232 456 212 Q466 198 474 216 Q482 198 492 212 Q504 232 474 258Z" stroke-width="2.5"/>
      <path d="M170 404 L170 438 M166 404 L159 393 M174 404 L181 393" stroke-width="2.5"/>
      <circle cx="157" cy="412" r="10" stroke-width="2.5"/>
      <circle cx="183" cy="412" r="10" stroke-width="2.5"/>
      <circle cx="160" cy="430" r="8" stroke-width="2.5"/>
      <circle cx="180" cy="430" r="8" stroke-width="2.5"/>
      <path d="M96 882 Q240 850 400 874 Q560 898 726 870" stroke-width="2.5"/>
      <path d="M296 872 Q300 848 304 872 M304 871 Q308 842 312 871 M312 872 Q316 850 320 872" stroke-width="2.5"/>
      <path d="M694 862 Q698 838 702 862 M702 861 Q706 832 710 861 M710 862 Q714 840 718 862" stroke-width="2.5"/>
      <circle cx="160" cy="760" r="12"/>
      <circle cx="160" cy="736" r="10"/>
      <circle cx="181" cy="748" r="10"/>
      <circle cx="181" cy="772" r="10"/>
      <circle cx="160" cy="784" r="10"/>
      <circle cx="139" cy="772" r="10"/>
      <circle cx="139" cy="748" r="10"/>
      <path d="M160 796 L160 868 M160 826 Q132 816 136 846 M160 840 Q188 832 184 860" stroke-width="2.5"/>
      <path d="M556 300 L564 318 L572 300 L564 282Z" stroke-width="2.5"/>
      <path d="M118 552 L125 568 L132 552 L125 536Z" stroke-width="2.5"/>
      <circle cx="610" cy="330" r="5" stroke-width="2.5"/>
      <circle cx="120" cy="300" r="4" stroke-width="2.5"/>
    `),
  },
  {
    id: "pizza-party",
    name: "Pizza Party",
    theme: "food",
    svg: wrap(`
      <path d="M200 720 L408 220 L616 720Z"/>
      <path d="M260 620 Q408 560 556 620" stroke-width="2.5"/>
      <path d="M300 500 Q408 450 516 500" stroke-width="2.5"/>
      <circle cx="350" cy="580" r="22"/>
      <circle cx="450" cy="540" r="18"/>
      <circle cx="400" cy="650" r="20"/>
      <circle cx="480" cy="660" r="16"/>
      <circle cx="360" cy="480" r="14"/>
      <circle cx="440" cy="420" r="12"/>
      <circle cx="180" cy="300" r="50"/>
      <path d="M155 280 Q180 250 205 280"/>
      <circle cx="165" cy="295" r="4"/><circle cx="195" cy="295" r="4"/>
      <path d="M170 315 Q180 325 190 315"/>
      <circle cx="600" cy="280" r="8"/><circle cx="640" cy="320" r="5"/>
      <circle cx="150" cy="500" r="6"/><circle cx="650" cy="550" r="7"/>
    `),
  },
  {
    id: "submarine",
    name: "Sunny Submarine",
    theme: "vehicles",
    svg: wrap(`
      <ellipse cx="408" cy="500" rx="220" ry="110"/>
      <path d="M280 400 Q280 320 360 320 L456 320 Q536 320 536 400"/>
      <circle cx="360" cy="360" r="28"/>
      <circle cx="408" cy="360" r="28"/>
      <circle cx="456" cy="360" r="28"/>
      <circle cx="320" cy="500" r="32"/>
      <circle cx="400" cy="500" r="32"/>
      <circle cx="480" cy="500" r="32"/>
      <path d="M188 500 L120 460 L120 540Z"/>
      <path d="M408 610 L380 700 L436 700Z"/>
      <circle cx="200" cy="280" r="8"/><circle cx="250" cy="220" r="5"/>
      <circle cx="600" cy="250" r="6"/><circle cx="650" cy="320" r="4"/>
      <path d="M150 650 Q180 630 170 680" stroke-width="2.5"/>
      <path d="M580 680 Q620 650 610 720" stroke-width="2.5"/>
      <circle cx="300" cy="750" r="12"/><circle cx="500" cy="780" r="9"/>
      <path d="M100 850 Q250 820 400 850 Q550 880 700 840" stroke-width="2.5"/>
    `),
  },
];

export function getTemplateById(id: string): TemplateItem | undefined {
  return TEMPLATES.find((t) => t.id === id);
}

/** Draw an SVG string onto a canvas (lines layer). */
export async function renderSvgToCanvas(
  canvas: HTMLCanvasElement,
  svg: string,
): Promise<void> {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const trimmed = svg.trim();
  if (!trimmed || trimmed.includes("></svg>") && /viewBox/.test(trimmed) === false) {
    // blank ok
  }
  // Empty inner content — nothing to draw
  if (/<svg[^>]*>\s*<\/svg>/i.test(trimmed)) {
    return;
  }

  const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  try {
    const img = await loadImage(url);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load SVG"));
    img.src = url;
  });
}

export function sanitizeSvg(raw: string): string | null {
  let svg = raw.trim();
  // Extract svg block if wrapped in markdown/code
  const match = svg.match(/<svg[\s\S]*?<\/svg>/i);
  if (match) svg = match[0];
  if (!svg.toLowerCase().startsWith("<svg")) return null;

  // Strip scripts and event handlers
  svg = svg.replace(/<script[\s\S]*?<\/script>/gi, "");
  svg = svg.replace(/\son\w+\s*=\s*(['"]).*?\1/gi, "");
  svg = svg.replace(/javascript:/gi, "");

  // Ensure xmlns and viewBox
  if (!/xmlns=/.test(svg)) {
    svg = svg.replace(
      /<svg/i,
      `<svg xmlns="http://www.w3.org/2000/svg"`,
    );
  }
  if (!/viewBox=/.test(svg)) {
    svg = svg.replace(
      /<svg/i,
      `<svg viewBox="0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}"`,
    );
  }

  return svg;
}
