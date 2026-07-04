export type MetadataField = 'movementPattern' | 'executionType' | 'primaryEquipment' | 'secondaryEquipment';
type LabelLocale = 'pt-BR' | 'en-US';

// Canonical (stored) value → per-locale display label. Stored values never change.
// `secondaryEquipment` shares the `primaryEquipment` table (see metadataLabel below) because the
// "Equipamento secundário" ChipPicker reuses the same PRIMARY_EQUIPMENTS option list; free-typed
// legacy/custom values (e.g. "Banco", "Anilha") are intentionally left out — they were entered in
// Portuguese already and the fallback below renders them as-is, never undefined.
const LABELS: Record<Exclude<MetadataField, 'secondaryEquipment'>, Record<string, { 'pt-BR': string; 'en-US': string }>> = {
  movementPattern: {
    'Horizontal Push':      { 'pt-BR': 'Empurrar horizontal',   'en-US': 'Horizontal push' },
    'Vertical Push':        { 'pt-BR': 'Empurrar vertical',     'en-US': 'Vertical push' },
    'Horizontal Pull':      { 'pt-BR': 'Puxar horizontal',      'en-US': 'Horizontal pull' },
    'Vertical Pull':        { 'pt-BR': 'Puxar vertical',        'en-US': 'Vertical pull' },
    'Horizontal Adduction': { 'pt-BR': 'Adução horizontal',     'en-US': 'Horizontal adduction' },
    'Horizontal Abduction': { 'pt-BR': 'Abdução horizontal',    'en-US': 'Horizontal abduction' },
    'Abduction':            { 'pt-BR': 'Abdução',               'en-US': 'Abduction' },
    'Squat':                { 'pt-BR': 'Agachar',               'en-US': 'Squat' },
    'Hinge':                { 'pt-BR': 'Dobradiça de quadril',  'en-US': 'Hinge' },
    'Lunge':                { 'pt-BR': 'Afundo',                'en-US': 'Lunge' },
    'Rotation':             { 'pt-BR': 'Rotação',               'en-US': 'Rotation' },
    'Anti-Rotation':        { 'pt-BR': 'Anti-rotação',          'en-US': 'Anti-rotation' },
    'Anti-Extension':       { 'pt-BR': 'Anti-extensão',         'en-US': 'Anti-extension' },
    'Carry':                { 'pt-BR': 'Carregamento',          'en-US': 'Carry' },
    'Gait':                 { 'pt-BR': 'Marcha',                'en-US': 'Gait' },
    'Jump':                 { 'pt-BR': 'Salto',                 'en-US': 'Jump' },
    'Sprint':               { 'pt-BR': 'Sprint',                'en-US': 'Sprint' },
    'Trunk Flexion':        { 'pt-BR': 'Flexão de tronco',      'en-US': 'Trunk flexion' },
    'Lateral Flexion':      { 'pt-BR': 'Flexão lateral',        'en-US': 'Lateral flexion' },
    'Hip Extension':        { 'pt-BR': 'Extensão de quadril',   'en-US': 'Hip extension' },
    'Hip Flexion':          { 'pt-BR': 'Flexão de quadril',     'en-US': 'Hip flexion' },
    'Knee Extension':       { 'pt-BR': 'Extensão de joelho',    'en-US': 'Knee extension' },
    'Knee Flexion':         { 'pt-BR': 'Flexão de joelho',      'en-US': 'Knee flexion' },
    'Elbow Extension':      { 'pt-BR': 'Extensão de cotovelo',  'en-US': 'Elbow extension' },
    'Elbow Flexion':        { 'pt-BR': 'Flexão de cotovelo',    'en-US': 'Elbow flexion' },
    'Plantar Flexion':      { 'pt-BR': 'Flexão plantar',        'en-US': 'Plantar flexion' },
  },
  executionType: {
    'Unilateral':  { 'pt-BR': 'Unilateral', 'en-US': 'Unilateral' },
    'Bilateral':   { 'pt-BR': 'Bilateral',  'en-US': 'Bilateral' },
    'Can Be Both': { 'pt-BR': 'Ambos',      'en-US': 'Can be both' },
  },
  primaryEquipment: {
    'Barbell':              { 'pt-BR': 'Barra',                     'en-US': 'Barbell' },
    'Dumbbell':             { 'pt-BR': 'Halter',                    'en-US': 'Dumbbell' },
    'Cable':                { 'pt-BR': 'Cabo (polia)',              'en-US': 'Cable' },
    'Smith Machine':        { 'pt-BR': 'Máquina Smith',             'en-US': 'Smith machine' },
    'Hack Squat Machine':   { 'pt-BR': 'Máquina hack',              'en-US': 'Hack squat machine' },
    'Leg Press':            { 'pt-BR': 'Leg press',                 'en-US': 'Leg press' },
    'Pec Deck':             { 'pt-BR': 'Voador (pec deck)',         'en-US': 'Pec deck' },
    'Chest Supported Row':  { 'pt-BR': 'Remada apoiada',            'en-US': 'Chest-supported row' },
    'Bodyweight':           { 'pt-BR': 'Peso corporal',             'en-US': 'Bodyweight' },
    'Resistance Band':      { 'pt-BR': 'Elástico',                  'en-US': 'Resistance band' },
    'Kettlebell':           { 'pt-BR': 'Kettlebell',                'en-US': 'Kettlebell' },
    'Landmine':             { 'pt-BR': 'Landmine',                  'en-US': 'Landmine' },
    'Suspension Trainer':   { 'pt-BR': 'Fitas de suspensão (TRX)',  'en-US': 'Suspension trainer' },
    'Assisted Machine':     { 'pt-BR': 'Máquina assistida',         'en-US': 'Assisted machine' },
    'Plate-Loaded Machine': { 'pt-BR': 'Máquina de anilhas',        'en-US': 'Plate-loaded machine' },
    'Selectorized Machine': { 'pt-BR': 'Máquina seletorizada',      'en-US': 'Selectorized machine' },
    'Decline Bench':        { 'pt-BR': 'Banco declinado',           'en-US': 'Decline bench' },
    'Flat Bench':           { 'pt-BR': 'Banco reto',                'en-US': 'Flat bench' },
    'Incline Bench':        { 'pt-BR': 'Banco inclinado',           'en-US': 'Incline bench' },
  },
};

export function metadataLabel(field: MetadataField, value: string, locale: LabelLocale = 'pt-BR'): string {
  const table = LABELS[field === 'secondaryEquipment' ? 'primaryEquipment' : field];
  return table[value]?.[locale] ?? value;
}
