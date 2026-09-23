import { INITIAL_UPS, Item, InventarioItem } from '../types';

export interface MasterRowParsed {
  id: string;
  desc: string;
  area: string;
  reorden: number;
  stockInicial?: number;
  up?: string;
  isValid: boolean;
  error?: string;
  isExisting?: boolean;
}

export const MASTER_TEMPLATE_HEADERS = [
  'CODIGO_ID',
  'DESCRIPCION',
  'AREA',
  'PUNTO_REORDEN',
  'STOCK_INICIAL',
  'UBICACION_UP'
];

export const MASTER_TEMPLATE_SAMPLE_ROWS = [
  ['MX-F-PCK-001', 'FORMATO RECEPCION DE FRUTA EN COOLER', 'FORMATOS', '200', '150', 'LUPITA'],
  ['MX-F-PCK-003', 'FORMATO CONTROL DE PRE-FRIO', 'FORMATOS', '100', '80', 'PACKING TEPA'],
  ['ET4X6-PTI', 'ETIQUETA PTI 4X6 ROLLO (1000 PZ)', 'ETIQUETAS', '15', '25', 'LUPITA'],
  ['SS-PV-01', 'SELLO DE SEGURIDAD PLASTICO COLOR VERDE', 'EMBARQUES', '500', '1200', 'ANITA'],
  ['CLX-10LT', 'CLORALEX EL RENDIDOR 10 LITROS', 'LIMPIEZA', '5', '12', 'SORAYA'],
  ['ESQ-CART-120', 'ESQUINEROS DE CARTON CORRUGADO 1.20M', 'EMPAQUE', '300', '450', 'YASMINE'],
  ['FLEJE-POL-1/2', 'ROLLO DE FLEJE POLIPROPILENO 1/2 NEGRO', 'EMPAQUE', '8', '14', 'PACKING TEPA'],
  ['GUANTE-NIT-M', 'GUANTES DE NITRILO AZUL TALLA MEDIANA (CAJA 100 PZ)', 'SEGURIDAD', '20', '35', 'BC CAMALU']
];

/**
 * Generates the full CSV content for the Master Template with UTF-8 BOM
 */
export function generateMasterTemplateCSV(): string {
  const lines = [
    MASTER_TEMPLATE_HEADERS.join(','),
    ...MASTER_TEMPLATE_SAMPLE_ROWS.map(row =>
      row
        .map(cell => {
          if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
            return `"${cell.replace(/"/g, '""')}"`;
          }
          return cell;
        })
        .join(',')
    )
  ];
  return '\uFEFF' + lines.join('\r\n');
}

/**
 * Generates full CSV content from current items catalog in the exact same format
 * as the Master Document (Documento Maestro).
 */
export function generateMasterExportCSV(
  itemsToExport: Item[],
  inventario?: InventarioItem[],
  upsList: string[] = INITIAL_UPS,
  selectedUp?: string
): string {
  const invMap = new Map<string, InventarioItem>();
  if (inventario) {
    inventario.forEach(inv => invMap.set(inv.id, inv));
  }

  const rows: string[][] = [];

  itemsToExport.forEach(item => {
    const inv = invMap.get(item.id);
    const id = item.id.toUpperCase();
    const desc = item.desc.toUpperCase();
    const area = (item.area || 'GENERAL').toUpperCase();
    const reorden = String(item.reorden || 0);

    if (selectedUp && selectedUp !== 'ALL' && selectedUp !== 'all') {
      const stock = inv?.upStock?.[selectedUp] ?? 0;
      rows.push([id, desc, area, reorden, String(stock), selectedUp]);
    } else {
      if (inv && inv.upStock) {
        const positiveUps = Object.entries(inv.upStock).filter(
          ([, qty]) => typeof qty === 'number' && qty > 0
        );

        if (positiveUps.length > 0) {
          positiveUps.forEach(([upName, qty]) => {
            rows.push([id, desc, area, reorden, String(qty), upName]);
          });
        } else {
          const defaultUp = upsList[0] || 'LUPITA';
          rows.push([id, desc, area, reorden, '0', defaultUp]);
        }
      } else {
        const defaultUp = upsList[0] || 'LUPITA';
        rows.push([id, desc, area, reorden, '0', defaultUp]);
      }
    }
  });

  const lines = [
    MASTER_TEMPLATE_HEADERS.join(','),
    ...rows.map(row =>
      row
        .map(cell => {
          if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
            return `"${cell.replace(/"/g, '""')}"`;
          }
          return cell;
        })
        .join(',')
    )
  ];

  return '\uFEFF' + lines.join('\r\n');
}

/**
 * Triggers a browser download of the items catalog in Documento Maestro format
 */
export function downloadMasterExportCSV(
  itemsToExport: Item[],
  inventario?: InventarioItem[],
  upsList: string[] = INITIAL_UPS,
  selectedUp?: string,
  fileName?: string
) {
  const dateStr = new Date().toISOString().split('T')[0];
  const defaultName =
    selectedUp && selectedUp !== 'ALL' && selectedUp !== 'all'
      ? `documento_maestro_${selectedUp.toLowerCase().replace(/\s+/g, '_')}_${dateStr}.csv`
      : `documento_maestro_catalogo_items_${dateStr}.csv`;

  const csvContent = generateMasterExportCSV(itemsToExport, inventario, upsList, selectedUp);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', fileName || defaultName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Triggers a browser download of the Master Document CSV template
 */
export function downloadMasterTemplate(fileName = 'plantilla_documento_maestro_inventario.csv') {
  const csvContent = generateMasterTemplateCSV();
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Parse CSV / TSV text into structured rows
 */
export function parseMasterDocumentText(
  rawText: string,
  existingItemIds: Set<string>,
  knownUps: string[] = INITIAL_UPS
): {
  rows: MasterRowParsed[];
  validCount: number;
  invalidCount: number;
  newCount: number;
  existingCount: number;
} {
  const cleanText = rawText.replace(/^\uFEFF/, '').trim();
  if (!cleanText) {
    return { rows: [], validCount: 0, invalidCount: 0, newCount: 0, existingCount: 0 };
  }

  // Detect delimiter: comma, semicolon or tab
  const firstLine = cleanText.split('\n')[0];
  let delimiter = ',';
  if (firstLine.includes('\t')) {
    delimiter = '\t';
  } else if ((firstLine.match(/;/g) || []).length > (firstLine.match(/,/g) || []).length) {
    delimiter = ';';
  }

  const rawLines = cleanText.split(/\r?\n/);
  const rows: MasterRowParsed[] = [];
  const seenBatchKeys = new Set<string>();

  let startIndex = 0;
  // Check if first line is a header
  if (rawLines.length > 0) {
    const normalizedHeader = rawLines[0].toUpperCase();
    if (
      normalizedHeader.includes('CODIGO') ||
      normalizedHeader.includes('ID') ||
      normalizedHeader.includes('DESC') ||
      normalizedHeader.includes('ITEM')
    ) {
      startIndex = 1;
    }
  }

  for (let i = startIndex; i < rawLines.length; i++) {
    const line = rawLines[i].trim();
    if (!line) continue;

    // Simple robust cell splitting respecting quotes
    const cells: string[] = [];
    let curCell = '';
    let inQuotes = false;

    for (let charIdx = 0; charIdx < line.length; charIdx++) {
      const char = line[charIdx];
      if (char === '"') {
        if (inQuotes && line[charIdx + 1] === '"') {
          curCell += '"';
          charIdx++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === delimiter && !inQuotes) {
        cells.push(curCell.trim());
        curCell = '';
      } else {
        curCell += char;
      }
    }
    cells.push(curCell.trim());

    const id = (cells[0] || '').trim().toUpperCase();
    const desc = (cells[1] || '').trim().toUpperCase();
    const area = (cells[2] || '').trim().toUpperCase() || 'GENERAL';
    const reordenRaw = (cells[3] || '').trim();
    const stockRaw = (cells[4] || '').trim();
    let up = (cells[5] || '').trim().toUpperCase();

    // Normalize UP against known UPs
    const foundUp = knownUps.find(u => u.toLowerCase() === up.toLowerCase());
    if (foundUp) {
      up = foundUp;
    } else if (!up) {
      up = knownUps[0] || 'LUPITA';
    }

    // Validation
    let isValid = true;
    let error = '';

    if (!id) {
      isValid = false;
      error = 'Falta el Código ID del producto';
    } else if (!desc) {
      isValid = false;
      error = 'Falta la Descripción del producto';
    }

    const batchKey = `${id}__${up}`;
    if (seenBatchKeys.has(batchKey)) {
      isValid = false;
      error = `Fila duplicada en el lote para ${id} en ${up}`;
    }

    if (id) {
      seenBatchKeys.add(batchKey);
    }

    const reorden = Math.max(0, parseInt(reordenRaw, 10) || 0);
    const stockInicial = stockRaw ? Math.max(0, parseFloat(stockRaw) || 0) : undefined;

    const isExisting = Boolean(id && existingItemIds.has(id));

    rows.push({
      id,
      desc,
      area,
      reorden,
      stockInicial,
      up,
      isValid,
      error,
      isExisting
    });
  }

  let validCount = 0;
  let invalidCount = 0;
  let newCount = 0;
  let existingCount = 0;

  rows.forEach(r => {
    if (r.isValid) {
      validCount++;
      if (r.isExisting) {
        existingCount++;
      } else {
        newCount++;
      }
    } else {
      invalidCount++;
    }
  });

  return { rows, validCount, invalidCount, newCount, existingCount };
}
