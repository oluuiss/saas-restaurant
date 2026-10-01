// Planta do salão: tipos de elemento, tamanhos e posição das cadeiras.
// Coordenadas em "células" (x, y = canto superior esquerdo). Cada célula vira CELL px no SVG.

export const CELL = 20;
export const SNAP = 0.5;

export const FLOOR_DEFAULT = { width: 24, height: 16 };
export const FLOOR_LIMITS = { min: 6, max: 100 };

/** Áreas fixas do salão. `label` é só para o painel (o site traduz pelo tipo). */
export const AREA_TYPES = {
  kitchen: { w: 6, h: 4, label: 'Cozinha' },
  bathroom: { w: 3, h: 3, label: 'Banheiro' },
  bar: { w: 7, h: 2, label: 'Bar' },
  cashier: { w: 3, h: 2, label: 'Caixa' },
  stairs: { w: 3, h: 3, label: 'Escada' },
  entrance: { w: 3, h: 0.5, label: 'Entrada' },
  window: { w: 5, h: 0.3, label: 'Janela' },
  wall: { w: 6, h: 0.4, label: 'Parede' },
  plant: { w: 1, h: 1, label: 'Planta' },
  zone: { w: 6, h: 5, label: 'Área livre' },
};

export const TABLE_SHAPES = {
  square: 'Quadrada',
  round: 'Redonda',
  rect: 'Retangular',
};

export const MAX_SEATS = 20;

export function tableSize(seats, shape) {
  const n = Math.max(1, Math.min(MAX_SEATS, seats));
  if (shape === 'round') {
    const d = n <= 2 ? 2 : n <= 4 ? 2.5 : n <= 6 ? 3 : n <= 8 ? 3.5 : 3.5 + (n - 8) * 0.25;
    return { w: d, h: d };
  }
  if (shape === 'square') {
    const s = n <= 2 ? 2 : n <= 4 ? 2.5 : n <= 8 ? 3 : 3 + Math.ceil((n - 8) / 4) * 0.75;
    return { w: s, h: s };
  }
  const ends = n >= 5 ? 2 : 0;
  const perSide = Math.ceil((n - ends) / 2);
  return { w: Math.max(3, perSide * 1.3 + 0.6), h: 2.5 };
}

/** Posições (em células) das cadeiras ao redor de uma mesa. */
export function chairPositions(table) {
  const { x, y, w, h, seats, shape } = table;
  const n = Math.max(1, Math.min(MAX_SEATS, seats));
  const cx = x + w / 2;
  const cy = y + h / 2;
  const gap = 0.45;

  if (shape === 'round') {
    const r = w / 2 + gap;
    return Array.from({ length: n }, (_, i) => {
      const angle = -Math.PI / 2 + (Math.PI * 2 * i) / n + (n === 2 ? Math.PI / 2 : 0);
      return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
    });
  }

  const sides = { top: 0, bottom: 0, left: 0, right: 0 };
  if (shape === 'square') {
    const order = ['left', 'right', 'top', 'bottom'];
    for (let i = 0; i < n; i++) sides[order[i % 4]] += 1;
  } else {
    const horizontal = w >= h;
    const ends = n >= 5 ? 2 : 0;
    const long = n - ends;
    const a = Math.ceil(long / 2);
    const b = long - a;
    if (horizontal) Object.assign(sides, { top: a, bottom: b, left: ends / 2, right: ends / 2 });
    else Object.assign(sides, { left: a, right: b, top: ends / 2, bottom: ends / 2 });
  }

  const along = (count, length) => Array.from({ length: count }, (_, i) => ((i + 0.5) * length) / count);
  return [
    ...along(sides.top, w).map((d) => [x + d, y - gap]),
    ...along(sides.bottom, w).map((d) => [x + d, y + h + gap]),
    ...along(sides.left, h).map((d) => [x - gap, y + d]),
    ...along(sides.right, h).map((d) => [x + w + gap, y + d]),
  ];
}

export const snap = (value) => Math.round(value / SNAP) * SNAP;

export const allTables = (site) =>
  (site.floors ?? []).flatMap((floor) =>
    floor.elements.filter((el) => el.type === 'table').map((table) => ({ ...table, floorId: floor.id })),
  );

export function nextTableLabel(site) {
  const used = new Set(allTables(site).map((t) => t.label));
  let n = allTables(site).length + 1;
  while (used.has(`M${n}`)) n += 1;
  return `M${n}`;
}

export const maxTableSeats = (site) => allTables(site).reduce((max, t) => Math.max(max, t.seats), 0);
