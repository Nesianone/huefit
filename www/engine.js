/* HueFit — rules engine + UI. Engine is DOM-free so it can be tested in Node. */
(function (root) {
  'use strict';

  /* ---------- Colour maths ---------- */
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  function hexToRgb(hex) {
    const h = hex.replace('#', '');
    return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16));
  }
  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
    let h = 0, s = 0; const l = (max + min) / 2;
    if (d) {
      s = d / (1 - Math.abs(2 * l - 1));
      if (max === r) h = ((g - b) / d) % 6;
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60; if (h < 0) h += 360;
    }
    return { h, s, l };
  }
  function hslToHex(h, s, l) {
    h = ((h % 360) + 360) % 360; s = clamp(s, 0, 1); l = clamp(l, 0, 1);
    const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = l - c / 2;
    let r = 0, g = 0, b = 0;
    if (h < 60) [r, g, b] = [c, x, 0]; else if (h < 120) [r, g, b] = [x, c, 0];
    else if (h < 180) [r, g, b] = [0, c, x]; else if (h < 240) [r, g, b] = [0, x, c];
    else if (h < 300) [r, g, b] = [x, 0, c]; else [r, g, b] = [c, 0, x];
    return '#' + [r, g, b].map(v => Math.round((v + m) * 255).toString(16).padStart(2, '0')).join('').toUpperCase();
  }
  const hexHsl = hex => rgbToHsl(...hexToRgb(hex));
  const normHex = v => { v = String(v || '').trim(); if (!v.startsWith('#')) v = '#' + v; return /^#[0-9a-f]{6}$/i.test(v) ? v.toUpperCase() : null; };

  function hueFamily(h) {
    if (h < 15 || h >= 345) return 'Red';
    if (h < 40) return 'Rust';
    if (h < 65) return 'Ochre';
    if (h < 90) return 'Olive';
    if (h < 160) return 'Sage';
    if (h < 195) return 'Teal';
    if (h < 250) return 'Blue';
    if (h < 290) return 'Indigo';
    return 'Plum';
  }
  function nameColour(hex) {
    const { h, s, l } = hexHsl(hex);
    if (s < 0.1) return l > .9 ? 'Crisp White' : l > .7 ? 'Light Grey' : l > .45 ? 'Heather Grey' : l > .2 ? 'Charcoal' : 'Black';
    const pre = l > .75 ? 'Pale' : l > .6 ? 'Soft' : l < .28 ? 'Deep' : s < .35 ? 'Dusty' : 'Muted';
    return `${pre} ${hueFamily(h)}`;
  }

  /* ---------- Content tables ---------- */
  const GARMENTS = ['Dress Shorts', 'Chinos', 'Tailored Trousers', 'Jeans'];
  const FORMALITY = ['Smart Casual', 'Relaxed Casual'];

  // Garment pieces by "kind" and formality
  const KINDS = {
    polo:      { smart: 'Knitted polo', relaxed: 'Piqué polo' },
    linen:     { smart: 'Linen button-down', relaxed: 'Camp-collar linen shirt' },
    tee:       { smart: 'Fine-gauge merino tee', relaxed: 'Waffle crew neck tee' },
    knit:      { smart: 'Lightweight merino crew', relaxed: 'Textured cotton knit' },
    oxford:    { smart: 'Oxford button-down', relaxed: 'Short-sleeve oxford' },
    overshirt: { smart: 'Unstructured overshirt', relaxed: 'Cotton overshirt over a tee' }
  };

  const R = (name, hex, why, kinds) => ({ name, hex, why, kinds });
  const A = (name, hex, why) => ({ name, hex, why });

  const BOTTOMS = {
    navy: {
      name: 'Navy', hex: '#1F2A44',
      shoes: { smart: ['Snuff suede loafers', 'Dark brown leather derbies'], relaxed: ['White leather court sneakers', 'Tan canvas sneakers'] },
      neutrals: [
        R('Crisp White', '#F7F7F4', 'Maximum value contrast against deep navy gives a clean, nautical sharpness.', ['oxford', 'polo']),
        R('Heather Grey', '#B5B8BF', 'A soft mid-light neutral that lifts navy without competing with it.', ['knit', 'tee']),
        R('Muted Ecru', '#E8DFCB', 'Warm off-white balances navy’s cool undertone for a more relaxed, premium feel.', ['linen', 'knit'])
      ],
      tonal: [
        R('Dusty Sky Blue', '#8FAFCB', 'Same cool hue family at a lighter value reads as one intentional tone-on-tone story.', ['oxford', 'polo']),
        R('Slate Blue', '#5C7494', 'A mid-value blue sits one step from navy, adding depth without contrast shock.', ['knit', 'tee']),
        R('Pale Chambray', '#B9CBE0', 'A faded blue echoes the base hue while keeping the top clearly lighter.', ['linen', 'oxford'])
      ],
      comp: [
        R('Muted Rust', '#B5603A', 'Orange sits opposite blue on the wheel; desaturating it keeps the contrast grown-up, not loud.', ['tee', 'polo']),
        R('Camel', '#C19A6B', 'A sandy orange-brown is complementary to navy in a softened, menswear-friendly saturation.', ['knit', 'overshirt']),
        R('Dusty Terracotta', '#C98467', 'A clay tone gives the warm pop of orange without the primary-colour intensity.', ['linen', 'polo'])
      ],
      avoid: [
        A('Black', '#111111', 'Dark on dark flattens into one murky block with no separation.'),
        A('Bright Cobalt', '#1F4FD8', 'A saturated blue next to navy looks like an accidental mismatch.'),
        A('Neon Orange', '#FF6A00', 'Pure primary orange overpowers navy’s muted tone.')
      ]
    },
    khaki: {
      name: 'Khaki / Sand', hex: '#C2B280',
      shoes: { smart: ['Chocolate suede loafers', 'Dark tan leather derbies'], relaxed: ['White leather court sneakers', 'Navy canvas sneakers'] },
      neutrals: [
        R('Crisp White', '#F7F7F4', 'White against warm sand looks fresh and summery without trying hard.', ['oxford', 'tee']),
        R('Navy', '#1F2A44', 'Dark cool against warm light is khaki’s classic anchor pairing.', ['polo', 'knit']),
        R('Charcoal Grey', '#4A4D52', 'A deep neutral grounds sand and keeps the outfit modern rather than preppy.', ['tee', 'knit'])
      ],
      tonal: [
        R('Sage', '#9CAF88', 'A grey-green sits beside yellow-brown on the wheel, so the palette stays earthy and calm.', ['linen', 'polo']),
        R('Warm Cream', '#EFE6CF', 'A lighter step of the same warm family gives a tonal, low-effort look.', ['linen', 'knit']),
        R('Soft Ochre', '#C9A24A', 'A deeper golden neighbour adds warmth while staying in the same family.', ['tee', 'polo'])
      ],
      comp: [
        R('Dusty Blue', '#6F8FAF', 'Blue opposes the yellow-orange of sand; a dusty version keeps it calm.', ['oxford', 'polo']),
        R('Deep Burgundy', '#6D2433', 'A rich red-purple adds depth against the light, warm base.', ['knit', 'tee']),
        R('Slate Teal', '#4F7C82', 'A cool blue-green gives clear contrast without brightness.', ['tee', 'linen'])
      ],
      avoid: [
        A('Same-Shade Beige', '#C8B88A', 'Too close to the base reads as a failed match, not a deliberate tonal outfit.'),
        A('Bright Mustard', '#E1AD01', 'Saturated yellow against sand blurs together and looks jaundiced.'),
        A('Neon Lime', '#B6FF00', 'A fluorescent green clashes with the soft, earthy base.')
      ]
    },
    olive: {
      name: 'Olive Green', hex: '#6B7040',
      shoes: { smart: ['Snuff suede loafers', 'Dark brown leather derbies'], relaxed: ['White leather court sneakers', 'Tan suede desert boots'] },
      neutrals: [
        R('Crisp White', '#F7F7F4', 'High contrast against muted olive keeps the look clean and fresh.', ['tee', 'oxford']),
        R('Stone', '#D8D2C2', 'A warm off-white sits naturally with olive’s yellow undertone.', ['linen', 'polo']),
        R('Heather Grey', '#B5B8BF', 'A cool light grey tempers olive’s earthiness without clashing.', ['knit', 'tee'])
      ],
      tonal: [
        R('Sage', '#A3B18A', 'A lighter, greyer green sits next to olive for a gentle monochrome.', ['linen', 'polo']),
        R('Khaki', '#C2B280', 'A yellow-brown neighbour keeps the palette earthy and warm.', ['polo', 'overshirt']),
        R('Forest Green', '#2F4F3A', 'A deeper green adds depth while staying in the same family.', ['knit', 'tee'])
      ],
      comp: [
        R('Deep Burgundy', '#6D2433', 'Red-purple opposes green; a deep, muted version feels rich rather than festive.', ['knit', 'polo']),
        R('Dusty Rose', '#C99A9A', 'A soft pink-red gives complementary contrast with a gentle touch.', ['linen', 'tee']),
        R('Aubergine', '#5B3A52', 'A dark plum adds contrast that suits olive’s depth.', ['knit', 'tee'])
      ],
      avoid: [
        A('Neon Green', '#39FF14', 'A fluorescent green makes muted olive look dull and dirty.'),
        A('Bright Red', '#D01F2A', 'Saturated red with olive tips into a festive or military look.'),
        A('Mud Brown', '#6B5A3A', 'Brown at the same depth blends into a swampy, undefined mush.')
      ]
    },
    charcoal: {
      name: 'Charcoal', hex: '#3B3E43',
      shoes: { smart: ['Black leather loafers', 'Dark brown leather derbies'], relaxed: ['White leather court sneakers', 'Grey suede sneakers'] },
      neutrals: [
        R('Crisp White', '#F7F7F4', 'The sharpest contrast available; clean and confident on charcoal.', ['oxford', 'tee']),
        R('Heather Grey', '#B5B8BF', 'A lighter grey steps up from charcoal for a refined tonal-neutral look.', ['knit', 'polo']),
        R('Muted Ecru', '#E8DFCB', 'Warm off-white softens charcoal’s coolness.', ['linen', 'knit'])
      ],
      tonal: [
        R('Slate', '#6B7480', 'A mid grey-blue steps lightly away from charcoal for a quiet monochrome.', ['knit', 'tee']),
        R('Pale Silver', '#D5D8DC', 'A very light grey creates clean value contrast in the same family.', ['polo', 'oxford']),
        R('Ash Blue', '#8A9BA8', 'A cool grey-blue sits right next to charcoal on the wheel.', ['tee', 'knit'])
      ],
      comp: [
        R('Mustard Gold', '#C9A227', 'Charcoal is neutral so a warm gold pops cleanly without clashing.', ['polo', 'tee']),
        R('Soft Coral', '#E08A73', 'A warm pink-orange adds energy against the cool grey base.', ['tee', 'linen']),
        R('Deep Teal', '#1F6F78', 'A rich blue-green gives colour without competing with charcoal’s depth.', ['knit', 'polo'])
      ],
      avoid: [
        A('Black', '#111111', 'Black over charcoal looks like a washed-out mismatch rather than intentional.'),
        A('Dull Brown', '#5A4632', 'Muddy brown against cool charcoal looks tired.'),
        A('Fluoro Yellow', '#E6FF00', 'Harsh fluorescent colour overwhelms the quiet base.')
      ]
    },
    stone: {
      name: 'Stone / Off-White', hex: '#D9D3C3',
      shoes: { smart: ['Chocolate suede loafers', 'Tan leather derbies'], relaxed: ['White leather court sneakers', 'Tan leather sandals'] },
      neutrals: [
        R('Navy', '#1F2A44', 'Dark navy gives crisp definition against pale stone.', ['polo', 'knit']),
        R('Charcoal Grey', '#4A4D52', 'A deep grey grounds a pale bottom and keeps it modern.', ['tee', 'knit']),
        R('Crisp White', '#F7F7F4', 'White is subtle on stone; it reads soft and summery, like a monochrome light look.', ['oxford', 'linen'])
      ],
      tonal: [
        R('Oatmeal', '#CBBFA6', 'A slightly deeper neutral gives gentle depth within the same family.', ['knit', 'linen']),
        R('Warm Cream', '#EFE6CF', 'A lighter warm cousin keeps the palette calm and cohesive.', ['linen', 'polo']),
        R('Taupe', '#A39382', 'A mid-value grey-brown adds weight without breaking the tonal story.', ['tee', 'knit'])
      ],
      comp: [
        R('Dusty Sky Blue', '#8FAFCB', 'A soft blue gives gentle cool contrast against a warm neutral.', ['oxford', 'polo']),
        R('Terracotta', '#B8654A', 'A clay tone is a warm accent that makes pale stone look expensive.', ['tee', 'linen']),
        R('Forest Green', '#2F4F3A', 'A deep green provides clear, earthy contrast.', ['knit', 'polo'])
      ],
      avoid: [
        A('Same-Shade Off-White', '#E6E0D0', 'A near-identical shade washes out and loses definition.'),
        A('Pale Yellow', '#F2E8A0', 'A pastel yellow dissolves into stone and looks sallow.'),
        A('Pale Peach', '#F3D3B8', 'Peach drifts toward skin tone and looks washed out.')
      ]
    },
    black: {
      name: 'Black', hex: '#141414',
      shoes: { smart: ['Black leather loafers', 'Dark brown leather derbies'], relaxed: ['White leather court sneakers', 'Black minimal sneakers'] },
      neutrals: [
        R('Crisp White', '#F7F7F4', 'Maximum contrast; the sharpest, most graphic pairing.', ['oxford', 'tee']),
        R('Heather Grey', '#B5B8BF', 'A soft grey keeps contrast gentler than white.', ['knit', 'polo']),
        R('Muted Ecru', '#E8DFCB', 'A warm off-white softens black’s harshness.', ['linen', 'knit'])
      ],
      tonal: [
        R('Charcoal', '#3B3E43', 'A lighter step on the same achromatic axis gives depth without colour.', ['knit', 'tee']),
        R('Graphite', '#6A6D72', 'A mid grey stays quiet but separates clearly from black.', ['polo', 'tee']),
        R('Slate', '#6B7480', 'A cool grey-blue adds subtle interest while staying tonal.', ['knit', 'tee'])
      ],
      comp: [
        R('Deep Burgundy', '#6D2433', 'Black is neutral, so a rich red adds drama without clashing.', ['knit', 'polo']),
        R('Emerald', '#1F5F46', 'A deep jewel green looks luxurious against black.', ['polo', 'tee']),
        R('Rich Camel', '#B98B5A', 'Warm brown-orange gives a classic, sophisticated contrast.', ['knit', 'overshirt'])
      ],
      avoid: [
        A('Dark Navy', '#1F2A44', 'Near-black navy beside black looks like an accidental mismatch.'),
        A('Dark Chocolate', '#3B2A20', 'Very dark brown against black looks muddy and unresolved.'),
        A('Washed Pastel Yellow', '#F3EBA8', 'A weak pastel looks sickly against such a hard base.')
      ]
    },
    tobacco: {
      name: 'Tobacco / Tan', hex: '#9A6B3F',
      shoes: { smart: ['Dark brown leather derbies', 'Chocolate suede loafers'], relaxed: ['White leather court sneakers', 'Navy canvas sneakers'] },
      neutrals: [
        R('Crisp White', '#F7F7F4', 'White pops cleanly against warm brown and keeps the look fresh.', ['oxford', 'tee']),
        R('Navy', '#1F2A44', 'Cool dark blue against warm brown is a timeless menswear pairing.', ['polo', 'knit']),
        R('Warm Cream', '#EFE6CF', 'Cream sits harmoniously with the warm brown base.', ['linen', 'knit'])
      ],
      tonal: [
        R('Sand', '#D8C8A8', 'A lighter warm neutral stays in the same colour family.', ['linen', 'polo']),
        R('Camel', '#C19A6B', 'A lighter brown-orange makes a layered tonal story.', ['knit', 'overshirt']),
        R('Muted Rust', '#B5603A', 'A warmer, more saturated neighbour adds energy within the family.', ['tee', 'polo'])
      ],
      comp: [
        R('Dusty Sky Blue', '#8FAFCB', 'Blue opposes orange-brown; a soft shade stays calm.', ['oxford', 'polo']),
        R('Slate Teal', '#4F7C82', 'A cool blue-green provides contrast without brightness.', ['tee', 'knit']),
        R('Deep Indigo', '#2C3E6B', 'A rich blue gives sophisticated depth against warm tan.', ['knit', 'polo'])
      ],
      avoid: [
        A('Bright Orange', '#FF7A00', 'Saturated orange fights tan and looks like a clash.'),
        A('Muddy Brown', '#6B4A2E', 'Brown on brown without contrast swallows both pieces.'),
        A('Bright Mustard', '#E1AD01', 'Strong yellow against tan looks jaundiced and unrefined.')
      ]
    },
    burgundy: {
      name: 'Burgundy', hex: '#6D2433',
      shoes: { smart: ['Dark brown leather derbies', 'Black leather loafers'], relaxed: ['White leather court sneakers', 'Grey suede sneakers'] },
      neutrals: [
        R('Crisp White', '#F7F7F4', 'White makes rich burgundy look crisp and intentional.', ['oxford', 'tee']),
        R('Heather Grey', '#B5B8BF', 'A cool grey calms burgundy’s warmth.', ['knit', 'polo']),
        R('Navy', '#1F2A44', 'Navy and burgundy are a classic deep-on-deep pairing.', ['knit', 'polo']),
        R('Charcoal Grey', '#4A4D52', 'Charcoal gives a sleek, serious contrast.', ['tee', 'knit'])
      ],
      tonal: [
        R('Dusty Rose', '#C99A9A', 'A lighter, softer step of the same red family.', ['linen', 'tee']),
        R('Blush', '#E7C9C4', 'A pale pink gives clear value contrast in the same hue.', ['linen', 'polo']),
        R('Aubergine', '#5B3A52', 'A purple neighbour adds depth without leaving the family.', ['knit', 'tee'])
      ],
      comp: [
        R('Sage Green', '#9CAF88', 'Green opposes red; a soft sage keeps it refined.', ['linen', 'polo']),
        R('Forest Green', '#2F4F3A', 'A deep green is the rich complement to burgundy.', ['knit', 'polo']),
        R('Muted Teal', '#4F7C82', 'A cool blue-green gives clear contrast with a soft edge.', ['tee', 'knit'])
      ],
      avoid: [
        A('Bright Red', '#D01F2A', 'Red on red looks like a mismatched set.'),
        A('Hot Pink', '#FF2E93', 'Saturated pink makes burgundy look dull and heavy.'),
        A('Dark Brown', '#4A2E24', 'Brown at the same depth turns muddy.')
      ]
    },
    denim: {
      name: 'Washed Denim', hex: '#7FA0BE',
      shoes: { smart: ['Chocolate suede loafers', 'Tan leather derbies'], relaxed: ['White leather court sneakers', 'Tan canvas sneakers'] },
      neutrals: [
        R('Crisp White', '#F7F7F4', 'White with faded denim is the classic, unfussy pairing.', ['tee', 'oxford']),
        R('Heather Grey', '#B5B8BF', 'A soft grey sits calmly beside faded blue.', ['knit', 'tee']),
        R('Muted Ecru', '#E8DFCB', 'Warm off-white balances denim’s coolness.', ['linen', 'knit'])
      ],
      tonal: [
        R('Navy', '#1F2A44', 'A deeper blue creates clear value contrast in the same hue.', ['polo', 'knit']),
        R('Pale Sky', '#BFD3E6', 'A lighter version of the same blue reads as a clean tonal look.', ['oxford', 'linen']),
        R('Slate Blue', '#5C7494', 'A deeper blue neighbour adds subtle depth.', ['knit', 'tee'])
      ],
      comp: [
        R('Muted Rust', '#B5603A', 'Orange opposes blue; muted rust is warm and refined against faded denim.', ['tee', 'polo']),
        R('Terracotta', '#B8654A', 'A clay tone gives warm contrast without loudness.', ['linen', 'tee']),
        R('Soft Ochre', '#C9A24A', 'A golden yellow-orange sets off denim’s blue.', ['polo', 'tee'])
      ],
      avoid: [
        A('Near-Match Blue', '#6F93C0', 'A blue close to the denim looks like an almost-match.'),
        A('Neon Orange', '#FF6A00', 'Saturated orange fights faded blue and looks garish.'),
        A('Bright Royal Blue', '#1F4FD8', 'A strong, saturated blue overpowers washed denim.')
      ]
    }
  };

  // Footwear adjustments per garment
  const GARMENT_TIPS = {
    'Dress Shorts': 'Keep the hem just above the knee and wear no-show socks with loafers or sneakers.',
    'Chinos': 'A slim, slightly tapered leg with a small ankle break keeps this looking sharp.',
    'Tailored Trousers': 'Tuck or half-tuck a fitted top and keep a clean break at the shoe.',
    'Jeans': 'Dark, clean denim stays smarter; a light roll at the hem suits sneakers or loafers.'
  };

  /* ---------- Generated palette for custom hex ---------- */
  function generateBottom(hex) {
    const { h, s, l } = hexHsl(hex);
    const achro = s < 0.12;
    const dark = l < 0.35, light = l > 0.7;
    const mk = (hh, ss, ll) => hslToHex(hh, ss, ll);
    const rec = (hx, why, kinds) => R(nameColour(hx), hx, why, kinds);
    const neutrals = dark
      ? [rec('#F7F7F4', 'High value contrast keeps a dark base from looking heavy.', ['oxford', 'tee']),
         rec('#B5B8BF', 'A soft grey lifts a dark base without strong contrast.', ['knit', 'polo']),
         rec('#E8DFCB', 'Warm off-white softens a dark bottom.', ['linen', 'knit'])]
      : light
      ? [rec('#1F2A44', 'Dark navy gives definition against a pale base.', ['polo', 'knit']),
         rec('#4A4D52', 'A deep grey grounds a light bottom.', ['tee', 'knit']),
         rec('#F7F7F4', 'White reads soft and fresh on a pale bottom.', ['oxford', 'linen'])]
      : [rec('#F7F7F4', 'White gives clean contrast to a mid-tone base.', ['oxford', 'tee']),
         rec('#1F2A44', 'Navy anchors a mid-tone bottom.', ['polo', 'knit']),
         rec('#B5B8BF', 'Heather grey stays neutral and quiet.', ['knit', 'tee'])];

    const tonal = achro
      ? [rec(mk(215, .12, clamp(l + .25, .1, .92)), 'A cool light tone keeps the palette quietly monochrome.', ['knit', 'tee']),
         rec(mk(30, .12, clamp(l + .35, .1, .94)), 'A warm light neutral softens the greyscale base.', ['linen', 'polo']),
         rec(mk(215, .18, clamp(l + .1, .1, .88)), 'A slightly bluer tone adds a hint of colour in the same family.', ['tee', 'knit'])]
      : [rec(mk(h, s * .7, clamp(l + (l < .5 ? .28 : -.22), .12, .9)), 'Same hue at a different value creates a tonal, monochrome look.', ['oxford', 'polo']),
         rec(mk(h + 28, s * .6, clamp(l + .12, .12, .88)), 'A neighbour on the wheel keeps the palette harmonious and calm.', ['knit', 'tee']),
         rec(mk(h - 28, s * .6, clamp(l + (l < .5 ? .2 : -.12), .12, .88)), 'The opposite neighbour gives gentle variation without contrast.', ['linen', 'polo'])];

    const comp = achro
      ? [rec('#C19A6B', 'A neutral base takes a warm camel without any clash.', ['knit', 'overshirt']),
         rec('#8FAFCB', 'Dusty blue adds a cool accent to a neutral bottom.', ['oxford', 'polo']),
         rec('#1F6F78', 'Deep teal adds richness against a greyscale base.', ['knit', 'tee'])]
      : [rec(mk(h + 180, clamp(s, .28, .45), clamp(.48 + (.5 - l) * .15, .38, .6)), 'The opposite colour on the wheel, toned down for menswear instead of primary-colour intensity.', ['tee', 'polo']),
         rec(mk(h + 150, clamp(s, .26, .4), clamp(.5, .4, .6)), 'A split-complement keeps contrast while feeling less stark.', ['knit', 'polo']),
         rec(mk(h + 210, clamp(s, .26, .4), clamp(.52, .4, .62)), 'The other split-complement gives a second, softer contrast option.', ['linen', 'tee'])];

    const avoid = achro
      ? [A('Near-Match Grey', mk(0, 0, clamp(l + .06, 0, 1)), 'Too close to the base reads as a mistake rather than a choice.'),
         A('Neon Green', '#39FF14', 'Fluorescent colour overwhelms a quiet neutral base.'),
         A('Hot Pink', '#FF2E93', 'Extreme saturation looks harsh against a flat base.')]
      : [A('Near-Match Shade', mk(h, s, clamp(l + (l > .5 ? -.06 : .06), 0, 1)), 'Almost the same colour looks like a failed match, not a deliberate pairing.'),
         A('Neon ' + hueFamily(h + 180), mk(h + 180, 1, .5), 'A fluorescent opposite fights the base and makes it look dull.'),
         dark ? A('Black', '#111111', 'Dark on dark flattens into a single block.')
              : A('Saturated ' + hueFamily(h), mk(h, 1, .45), 'A bright version of the base hue makes it look faded and cheap.')];

    const shoes = dark
      ? { smart: ['Snuff suede loafers', 'Dark brown leather derbies'], relaxed: ['White leather court sneakers', 'Tan canvas sneakers'] }
      : { smart: ['Chocolate suede loafers', 'Navy suede loafers'], relaxed: ['White minimal sneakers', 'Tan leather sandals'] };

    return { name: 'Custom ' + nameColour(hex), hex, shoes, neutrals, tonal, comp, avoid, custom: true };
  }

    /* ---------- Recommendation engine ---------- */
  const SEASONS = [{ v: 'any', label: 'Any' }, { v: 'summer', label: 'Summer' }, { v: 'autumn', label: 'Autumn' }, { v: 'winter', label: 'Winter' }, { v: 'spring', label: 'Spring' }];
  const CLIMATES = [{ v: 'hot', label: 'Hot' }, { v: 'mild', label: 'Mild' }, { v: 'cool', label: 'Cool' }];
  const SKIN = [
    { v: 'light', label: 'Light', color: '#F3D9C4', l: .78 },
    { v: 'lightmed', label: 'Light-medium', color: '#E1B995', l: .66 },
    { v: 'medium', label: 'Medium', color: '#C58F63', l: .52 },
    { v: 'tan', label: 'Tan / brown', color: '#9A6540', l: .38 },
    { v: 'deep', label: 'Deep', color: '#5A3825', l: .24 }
  ];
  const HAIR = [
    { v: 'black', label: 'Black', color: '#1B1B1B' },
    { v: 'darkbrown', label: 'Dark brown', color: '#3B2A1F' },
    { v: 'brown', label: 'Brown', color: '#6B4A2E' },
    { v: 'blonde', label: 'Blonde / light', color: '#C9A96B' },
    { v: 'grey', label: 'Grey / white', color: '#B5B8BF' }
  ];
  const TOPS = [
    { key: 'white', name: 'Crisp White', hex: '#F7F7F4' }, { key: 'grey', name: 'Heather Grey', hex: '#B5B8BF' },
    { key: 'black', name: 'Black', hex: '#111111' }, { key: 'navy', name: 'Navy', hex: '#1F2A44' },
    { key: 'sky', name: 'Dusty Sky Blue', hex: '#8FAFCB' }, { key: 'cream', name: 'Warm Cream', hex: '#EFE6CF' },
    { key: 'sage', name: 'Sage', hex: '#9CAF88' }, { key: 'olive', name: 'Olive', hex: '#6B7040' },
    { key: 'burgundy', name: 'Burgundy', hex: '#6D2433' }, { key: 'rust', name: 'Muted Rust', hex: '#B5603A' },
    { key: 'camel', name: 'Camel', hex: '#C19A6B' }, { key: 'mustard', name: 'Mustard Gold', hex: '#C9A227' }
  ];

  const CLIMATE_RANK = {
    hot: ['linen', 'tee', 'polo', 'oxford', 'knit', 'overshirt'],
    cool: ['knit', 'overshirt', 'oxford', 'polo', 'tee', 'linen']
  };
  const CLIMATE_PIECES = {
    hot: {
      knit: { smart: 'Fine-gauge cotton knit polo', relaxed: 'Lightweight cotton crew' },
      overshirt: { smart: 'Linen overshirt, sleeves rolled', relaxed: 'Open-weave camp shirt' }
    },
    cool: {
      linen: { smart: 'Brushed cotton button-down', relaxed: 'Flannel shirt' },
      tee: { smart: 'Merino long-sleeve tee', relaxed: 'Heavyweight long-sleeve tee' },
      polo: { smart: 'Merino polo', relaxed: 'Long-sleeve piqué polo' },
      oxford: { smart: 'Oxford shirt under a knit', relaxed: 'Oxford shirt layered over a tee' }
    }
  };
  const SHOE_SWAP = {
    hot: { 'Dark brown leather derbies': 'Brown leather loafers (no-show socks)', 'Tan suede desert boots': 'Tan leather sandals', 'Black leather loafers': 'Black leather loafers (no-show socks)' },
    cool: { 'Tan canvas sneakers': 'Suede desert boots', 'Tan leather sandals': 'Suede desert boots', 'Navy canvas sneakers': 'Navy suede chukka boots', 'White minimal sneakers': 'White leather sneakers, thick socks', 'White leather court sneakers': 'White leather sneakers, thick socks' }
  };
  const shoeFor = (shoe, clim) => (SHOE_SWAP[clim] && SHOE_SWAP[clim][shoe]) || shoe;
  function pieces(kinds, fm, clim) {
    const k = kinds.slice();
    if (CLIMATE_RANK[clim]) k.sort((a, b) => CLIMATE_RANK[clim].indexOf(a) - CLIMATE_RANK[clim].indexOf(b));
    return k.map(x => ((CLIMATE_PIECES[clim] || {})[x] || KINDS[x])[fm]);
  }

  /* ---------- Colour relationships ---------- */
  function dist(a, b) {
    const x = hexHsl(a), y = hexHsl(b);
    let dh = Math.abs(x.h - y.h); dh = Math.min(dh, 360 - dh) / 180;
    const hw = (x.s < .1 || y.s < .1) ? 0 : dh * Math.min(x.s, y.s) * 1.2;
    return Math.sqrt(hw * hw + Math.pow((x.l - y.l) * 1.3, 2) + Math.pow((x.s - y.s) * .5, 2));
  }
  function nearestPalette(hex) {
    let best = { key: null, d: 9 };
    Object.entries(BOTTOMS).forEach(([k, b]) => { const d = dist(hex, b.hex); if (d < best.d) best = { key: k, d }; });
    return best;
  }
  const bottomFor = hex => { const n = nearestPalette(hex); return n.d < .15 ? BOTTOMS[n.key] : generateBottom(hex); };

  const REL_LABEL = { classic: 'Safe pairing', tonal: 'Tonal pairing', comp: 'Contrast pairing', neutral: 'Judgement call', avoid: 'Avoid' };
  const REL_SCORE = { classic: 3, tonal: 2.5, comp: 2, neutral: 1, avoid: 0 };

  function relate(topHex, bottom) {
    let best = { rel: null, d: 9, item: null };
    [['avoid', bottom.avoid], ['classic', bottom.neutrals], ['tonal', bottom.tonal], ['comp', bottom.comp]].forEach(([rel, list]) =>
      list.forEach(item => { const d = dist(topHex, item.hex); if (d < best.d) best = { rel, d, item }; }));
    if (best.d < .14) return { rel: best.rel, d: best.d, item: best.item, why: best.item.why };
    const t = hexHsl(topHex), b = hexHsl(bottom.hex), dl = Math.abs(t.l - b.l);
    const out = (rel, why) => ({ rel, d: best.d, item: null, why });
    if (t.s > .85 && t.l > .3 && t.l < .7) return out('avoid', 'A fully saturated colour overpowers the quieter base.');
    if (t.s < .12) {
      if (dl > .3) return out('classic', 'A neutral with clear value contrast against the base.');
      if (dl < .12) return out('avoid', 'Too close in value to the base, so the two blur together.');
      return out('neutral', 'A neutral that neither contrasts strongly nor matches; check it in daylight.');
    }
    if (b.s < .12) return dl < .1 ? out('avoid', 'Almost the same depth as the base, so it looks like a near-miss.') : out('comp', 'A coloured top reads as a deliberate accent on a neutral base.');
    let dh = Math.abs(t.h - b.h); dh = Math.min(dh, 360 - dh);
    if (dh < 14 && dl < .12) return out('avoid', 'Almost the same shade as the base, which looks like a failed match.');
    if (dh < 45) return out('tonal', 'Neighbouring hues keep the palette harmonious.');
    if (dh >= 130) return out('comp', 'Hues from opposite sides of the wheel give clear contrast.');
    return out('neutral', 'Sits between tonal and contrast; try it and check in daylight.');
  }

  /* ---------- Personal fit (skin / hair / season) ---------- */
  function warmth(h, s) { if (s < .12) return 0; if (h < 70 || h >= 330) return 1; if (h >= 150 && h < 300) return -1; return 0; }
  function seasonMood(h, s, l, season) {
    switch (season) {
      case 'summer': return (l - .5) * .5;
      case 'winter': return (.5 - l) * .4;
      case 'autumn': return warmth(h, s) * .2 + (s > .15 && s < .55 ? .1 : 0);
      case 'spring': return (l - .45) * .3 + (s > .2 && s < .55 ? .1 : 0);
      default: return 0;
    }
  }
  function fitScore(hex, p, season) {
    p = p || {};
    const { h, s, l } = hexHsl(hex);
    let sc = 0, note = null;
    if (p.skin) {
      const sk = SKIN.find(x => x.v === p.skin);
      if (sk) {
        const c = Math.abs(l - sk.l);
        sc += c * 1.5;
        if (c < .12 && s < .4) { sc -= .6; note = 'wash'; }
        else if (c > .35) { sc += .2; note = 'flatter'; }
      }
    }
    if (p.undertone === 'warm' || p.undertone === 'cool') sc += (p.undertone === 'warm' ? 1 : -1) * warmth(h, s) * .3;
    if (p.hair === 'grey' && warmth(h, s) <= 0) sc += .15;
    if (p.hair === 'blonde' && l < .5) sc += .1;
    sc += seasonMood(h, s, l, season);
    return { sc, note };
  }
  const isRanked = (p, season) => !!(p && (p.skin || p.undertone === 'warm' || p.undertone === 'cool' || p.hair)) || (season && season !== 'any');

  /* ---------- Shoes (owned-shoe matching) ---------- */
  const SHOES = [
    { id: 'wht-leather', name: 'White leather sneakers', fam: 'white', f: 1, c: [0, .3, -.2] },
    { id: 'wht-canvas', name: 'White canvas sneakers', fam: 'white', f: 0, c: [.3, .2, -.5] },
    { id: 'blk-sneak', name: 'Black sneakers', fam: 'black', f: 0, c: [0, .2, .2] },
    { id: 'grey-sneak', name: 'Grey sneakers', fam: 'grey', f: .3, c: [0, .2, .2] },
    { id: 'trainers', name: 'Running / gym trainers', fam: 'grey', f: 0, c: [0, 0, 0], g: { 'Tailored Trousers': -2, 'Chinos': -.5, 'Jeans': -.3 } },
    { id: 'boat', name: 'Boat shoes', fam: 'tan', f: .8, c: [.5, .3, -.8] },
    { id: 'brn-loafer', name: 'Brown leather loafers', fam: 'brown', f: 1.5, c: [.3, .2, -.2] },
    { id: 'blk-loafer', name: 'Black leather loafers', fam: 'black', f: 1.6, c: [0, 0, .1] },
    { id: 'brn-derby', name: 'Brown leather dress shoes', fam: 'brown', f: 2, c: [-.8, 0, .3], g: { 'Dress Shorts': -1.2 } },
    { id: 'blk-derby', name: 'Black leather dress shoes', fam: 'black', f: 2, c: [-.8, 0, .3], g: { 'Dress Shorts': -1.5 } },
    { id: 'chukka', name: 'Suede desert boots / chukkas', fam: 'tan', f: 1.2, c: [-1, -.1, .6], g: { 'Dress Shorts': -1 } },
    { id: 'brn-boot', name: 'Brown leather boots', fam: 'brown', f: 1, c: [-1.5, -.2, .7], g: { 'Dress Shorts': -1.5 } },
    { id: 'blk-boot', name: 'Black leather boots', fam: 'black', f: 1, c: [-1.5, -.2, .7], g: { 'Dress Shorts': -1.5 } },
    { id: 'work-boot', name: 'Work boots', fam: 'brown', f: 0, c: [-1.5, -.3, .4], g: { 'Dress Shorts': -1.2, 'Tailored Trousers': -2, 'Chinos': -.4 } },
    { id: 'sandal', name: 'Leather sandals', fam: 'tan', f: .5, c: [.7, 0, -1.5], g: { 'Tailored Trousers': -2, 'Chinos': -.6, 'Jeans': -.4 } },
    { id: 'jandals', name: 'Jandals', fam: 'black', f: 0, c: [.6, -.2, -2], g: { 'Tailored Trousers': -2.5, 'Chinos': -1, 'Jeans': -.6, 'Dress Shorts': -.4 } }
  ];
  // how well each shoe colour family sits with each bottom (0 = poor, 2 = ideal)
  const SHOE_COMPAT = {
    navy:     { brown: 2, tan: 2, white: 2, grey: 1, black: .5 },
    khaki:    { brown: 2, tan: 1, white: 2, grey: 1, black: .5 },
    olive:    { brown: 2, tan: 2, white: 1.5, grey: 1, black: 1 },
    charcoal: { black: 2, brown: 1.5, white: 2, grey: 1.5, tan: 1 },
    stone:    { brown: 2, tan: 1.5, white: 1.5, grey: 1, black: 1.5 },
    black:    { black: 2, white: 2, grey: 1.5, brown: 1, tan: .5 },
    tobacco:  { brown: 1.5, tan: 1, white: 2, grey: 1.5, black: 1 },
    burgundy: { brown: 2, tan: 1, white: 1.5, grey: 1.5, black: 1.5 },
    denim:    { brown: 2, tan: 2, white: 2, grey: 1.5, black: 1 }
  };
  const SHOE_OK = 2.4;
  function shoeScore(shoe, bottomHex, fm, clim, garment) {
    const key = nearestPalette(bottomHex).key;
    const target = fm === 'smart' ? 1.6 : .5;
    const ci = { hot: 0, mild: 1, cool: 2 }[clim] ?? 1;
    return (1.5 - Math.abs(target - shoe.f) * 1.2) + (SHOE_COMPAT[key][shoe.fam] || 0) + shoe.c[ci] + ((shoe.g && shoe.g[garment]) || 0);
  }
  function pickShoes({ owned, bottomHex, fm, clim, garment }) {
    const list = SHOES.filter(s => owned.includes(s.id))
      .map(s => ({ id: s.id, name: s.name, score: shoeScore(s, bottomHex, fm, clim, garment) }))
      .sort((a, b) => b.score - a.score);
    return list.filter((s, i) => i === 0 || s.score >= 2.2).slice(0, 2);
  }
  function shoeLine(base, owned, bottomHex, fm, clim, garment) {
    if (!owned || !owned.length) return { text: base, note: null };
    const picks = pickShoes({ owned, bottomHex, fm, clim, garment });
    if (!picks.length) return { text: base, note: null };
    return { text: picks.map(p => p.name).join(' or '), note: picks[0].score < SHOE_OK ? 'Not ideal. A better match would be ' + base.toLowerCase() + ', which you don’t have yet.' : null };
  }
  // which shoe to buy next: biggest total improvement across the given bottoms
  function shoeGaps({ owned, bottomHexes, garment, climate }) {
    const clim = climate || 'mild';
    const best = {};
    const combos = [];
    ['smart', 'relaxed'].forEach(fm => bottomHexes.forEach(h => combos.push([fm, h])));
    const cur = combos.map(([fm, h]) => Math.max(0, ...SHOES.filter(s => owned.includes(s.id)).map(s => shoeScore(s, h, fm, clim, garment))));
    return SHOES.filter(s => !owned.includes(s.id)).map(s => {
      let gain = 0;
      combos.forEach(([fm, h], i) => { gain += Math.max(0, shoeScore(s, h, fm, clim, garment) - Math.max(cur[i], owned.length ? 0 : SHOE_OK - .01)); });
      return { id: s.id, name: s.name, gain };
    }).sort((a, b) => b.gain - a.gain).filter(x => x.gain > 0.5).slice(0, 2);
  }

  /* ---------- Bottoms -> tops ---------- */
  function recommend({ bottomKey, customHex, garment, formality, profile, season, climate, ownedShoes }) {
    const fm = formality === 'Relaxed Casual' ? 'relaxed' : 'smart';
    const clim = climate || 'mild';
    const bottom = bottomKey && BOTTOMS[bottomKey] ? BOTTOMS[bottomKey] : generateBottom(normHex(customHex) || '#1F2A44');
    const ranked = isRanked(profile, season);
    const decorate = (list) => {
      let items = list.map((r, i) => {
        const fit = fitScore(r.hex, profile, season);
        const sh = shoeLine(shoeFor(bottom.shoes[fm][i % bottom.shoes[fm].length], clim), ownedShoes, bottom.hex, fm, clim, garment);
        return {
          name: r.name, hex: r.hex, why: r.why,
          pieces: pieces(r.kinds, fm, clim),
          shoes: sh.text, shoeNote: sh.note,
          score: fit.sc, note: fit.note
        };
      });
      if (ranked) items = items.map((x, i) => ({ x, i })).sort((a, b) => b.x.score - a.x.score || a.i - b.i).map(o => o.x);
      return items;
    };
    return {
      bottom: { name: bottom.name, hex: bottom.hex },
      garment, formality, ranked,
      tip: GARMENT_TIPS[garment] || '',
      categories: [
        { id: 'classic', title: 'Classic & Safe', sub: 'Neutrals that work every time.', items: decorate(bottom.neutrals) },
        { id: 'tonal', title: 'Harmonious & Tonal', sub: 'Colour-wheel neighbours or shades of the base hue.', items: decorate(bottom.tonal) },
        { id: 'comp', title: 'Complementary Contrast', sub: 'Opposite or split-complement pairings, toned for menswear.', items: decorate(bottom.comp) }
      ],
      avoid: bottom.avoid
    };
  }

  /* ---------- Tops -> bottoms ---------- */
  function recommendBottoms({ topHex, topName, garment, formality, profile, season, climate, ownedShoes }) {
    const fm = formality === 'Relaxed Casual' ? 'relaxed' : 'smart';
    const clim = climate || 'mild';
    const hex = normHex(topHex) || '#FFFFFF';
    const g = { classic: [], tonal: [], comp: [], neutral: [], avoid: [] };
    Object.entries(BOTTOMS).forEach(([k, b]) => {
      const r = relate(hex, b);
      const kinds = (r.item && r.item.kinds) || ['polo', 'oxford'];
      const sh = shoeLine(shoeFor(b.shoes[fm][0], clim), ownedShoes, b.hex, fm, clim, garment);
      g[r.rel].push({ key: k, name: b.name, hex: b.hex, rel: r.rel, d: r.d, why: r.why, pieces: pieces(kinds, fm, clim), shoes: sh.text, shoeNote: sh.note });
    });
    const defs = [
      ['classic', 'Safest bottoms', 'Reliable, high-contrast or neutral pairings.'],
      ['tonal', 'Tonal bottoms', 'Same family or neighbouring hues.'],
      ['comp', 'Contrast bottoms', 'Opposite-side colours, toned for menswear.'],
      ['neutral', 'Judgement calls', 'Not clearly good or bad. Try them in daylight.'],
      ['avoid', 'Bottoms to avoid', 'These clash with or wash out this top.']
    ];
    return {
      top: { name: topName || nameColour(hex), hex },
      garment, formality, tip: GARMENT_TIPS[garment] || '',
      fit: fitScore(hex, profile, season), ranked: isRanked(profile, season),
      groups: defs.map(([id, title, sub]) => ({ id, title, sub, items: g[id].sort((a, b) => a.d - b.d) })).filter(x => x.items.length)
    };
  }

  /* ---------- Wardrobe ---------- */
  function wardrobeMatches(w, profile, season) {
    return ((w && w.bottoms) || []).map(b => {
      const bb = bottomFor(b.hex);
      const matches = ((w && w.tops) || []).map(t => {
        const r = relate(t.hex, bb), f = fitScore(t.hex, profile, season);
        return { top: t, rel: r.rel, why: r.why, score: REL_SCORE[r.rel] + f.sc * .3, note: f.note };
      }).sort((x, y) => y.score - x.score);
      return { bottom: b, matches };
    });
  }

  const engine = {
    recommend, recommendBottoms, wardrobeMatches, relate, dist, bottomFor, fitScore, normHex, nameColour,
    BOTTOMS, TOPS, SHOES, pickShoes, shoeGaps, SKIN, HAIR, SEASONS, CLIMATES, GARMENTS, FORMALITY, REL_LABEL, hexHsl, hslToHex
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = engine;
  root.HueFitEngine = engine;
})(typeof window !== 'undefined' ? window : globalThis);
