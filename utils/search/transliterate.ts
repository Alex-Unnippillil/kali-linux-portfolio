const CYRILLIC_TABLE: Record<string, string> = {
  а: 'a',
  б: 'b',
  в: 'v',
  г: 'g',
  д: 'd',
  е: 'e',
  ё: 'yo',
  ж: 'zh',
  з: 'z',
  и: 'i',
  й: 'y',
  к: 'k',
  л: 'l',
  м: 'm',
  н: 'n',
  о: 'o',
  п: 'p',
  р: 'r',
  с: 's',
  т: 't',
  у: 'u',
  ф: 'f',
  х: 'kh',
  ц: 'ts',
  ч: 'ch',
  ш: 'sh',
  щ: 'shch',
  ъ: '',
  ы: 'y',
  ь: '',
  э: 'e',
  ю: 'yu',
  я: 'ya',
  ї: 'i',
  і: 'i',
  ў: 'u',
};

const GREEK_TABLE: Record<string, string> = {
  α: 'a',
  β: 'v',
  γ: 'g',
  δ: 'd',
  ε: 'e',
  ζ: 'z',
  η: 'i',
  θ: 'th',
  ι: 'i',
  κ: 'k',
  λ: 'l',
  μ: 'm',
  ν: 'n',
  ξ: 'x',
  ο: 'o',
  π: 'p',
  ρ: 'r',
  σ: 's',
  ς: 's',
  τ: 't',
  υ: 'y',
  φ: 'f',
  χ: 'ch',
  ψ: 'ps',
  ω: 'o',
};

const HIRAGANA_TABLE: Record<string, string> = {
  あ: 'a',
  い: 'i',
  う: 'u',
  え: 'e',
  お: 'o',
  か: 'ka',
  き: 'ki',
  く: 'ku',
  け: 'ke',
  こ: 'ko',
  が: 'ga',
  ぎ: 'gi',
  ぐ: 'gu',
  げ: 'ge',
  ご: 'go',
  さ: 'sa',
  し: 'shi',
  す: 'su',
  せ: 'se',
  そ: 'so',
  ざ: 'za',
  じ: 'ji',
  ず: 'zu',
  ぜ: 'ze',
  ぞ: 'zo',
  た: 'ta',
  ち: 'chi',
  つ: 'tsu',
  て: 'te',
  と: 'to',
  だ: 'da',
  ぢ: 'ji',
  づ: 'zu',
  で: 'de',
  ど: 'do',
  な: 'na',
  に: 'ni',
  ぬ: 'nu',
  ね: 'ne',
  の: 'no',
  は: 'ha',
  ひ: 'hi',
  ふ: 'fu',
  へ: 'he',
  ほ: 'ho',
  ば: 'ba',
  び: 'bi',
  ぶ: 'bu',
  べ: 'be',
  ぼ: 'bo',
  ぱ: 'pa',
  ぴ: 'pi',
  ぷ: 'pu',
  ぺ: 'pe',
  ぽ: 'po',
  ま: 'ma',
  み: 'mi',
  む: 'mu',
  め: 'me',
  も: 'mo',
  や: 'ya',
  ゆ: 'yu',
  よ: 'yo',
  ら: 'ra',
  り: 'ri',
  る: 'ru',
  れ: 're',
  ろ: 'ro',
  わ: 'wa',
  を: 'o',
  ん: 'n',
  ー: '',
};

const KATAKANA_TABLE: Record<string, string> = {
  ア: 'a',
  イ: 'i',
  ウ: 'u',
  エ: 'e',
  オ: 'o',
  カ: 'ka',
  キ: 'ki',
  ク: 'ku',
  ケ: 'ke',
  コ: 'ko',
  ガ: 'ga',
  ギ: 'gi',
  グ: 'gu',
  ゲ: 'ge',
  ゴ: 'go',
  サ: 'sa',
  シ: 'shi',
  ス: 'su',
  セ: 'se',
  ソ: 'so',
  ザ: 'za',
  ジ: 'ji',
  ズ: 'zu',
  ゼ: 'ze',
  ゾ: 'zo',
  タ: 'ta',
  チ: 'chi',
  ツ: 'tsu',
  テ: 'te',
  ト: 'to',
  ダ: 'da',
  ヂ: 'ji',
  ヅ: 'zu',
  デ: 'de',
  ド: 'do',
  ナ: 'na',
  ニ: 'ni',
  ヌ: 'nu',
  ネ: 'ne',
  ノ: 'no',
  ハ: 'ha',
  ヒ: 'hi',
  フ: 'fu',
  ヘ: 'he',
  ホ: 'ho',
  バ: 'ba',
  ビ: 'bi',
  ブ: 'bu',
  ベ: 'be',
  ボ: 'bo',
  パ: 'pa',
  ピ: 'pi',
  プ: 'pu',
  ペ: 'pe',
  ポ: 'po',
  マ: 'ma',
  ミ: 'mi',
  ム: 'mu',
  メ: 'me',
  モ: 'mo',
  ヤ: 'ya',
  ユ: 'yu',
  ヨ: 'yo',
  ラ: 'ra',
  リ: 'ri',
  ル: 'ru',
  レ: 're',
  ロ: 'ro',
  ワ: 'wa',
  ヲ: 'o',
  ン: 'n',
  ヴ: 'vu',
  ー: '',
};

const EXTENDED_TABLE: Record<string, string> = {
  ß: 'ss',
  æ: 'ae',
  œ: 'oe',
  þ: 'th',
  đ: 'd',
  ħ: 'h',
  ł: 'l',
  ń: 'n',
  ś: 's',
  ž: 'z',
  č: 'c',
};

const TABLES: ReadonlyArray<Record<string, string>> = [
  CYRILLIC_TABLE,
  GREEK_TABLE,
  HIRAGANA_TABLE,
  KATAKANA_TABLE,
  EXTENDED_TABLE,
];

const COMBINING_MARKS_REGEX = /\p{M}+/gu;
const WHITESPACE_REGEX = /\s+/g;

const CHARACTER_MAP: Map<string, string> = TABLES.reduce((map, table) => {
  Object.entries(table).forEach(([from, to]) => {
    map.set(from, to);
  });
  return map;
}, new Map<string, string>());

const toTitleCase = (value: string): string =>
  value.length <= 1 ? value.toUpperCase() : value[0].toUpperCase() + value.slice(1);

const basicNormalize = (value: string): string =>
  value
    .normalize('NFKD')
    .replace(COMBINING_MARKS_REGEX, '')
    .normalize('NFC');

export const finalizeNormalized = (value: string): string =>
  basicNormalize(value)
    .toLowerCase()
    .replace(WHITESPACE_REGEX, ' ')
    .trim();

export const transliterate = (value: string): string => {
  if (!value) return '';
  const normalized = value.normalize('NFKC');
  let result = '';
  for (const char of normalized) {
    const direct = CHARACTER_MAP.get(char);
    if (direct !== undefined) {
      result += direct;
      continue;
    }
    const lower = char.toLowerCase();
    const mapped = CHARACTER_MAP.get(lower);
    if (mapped !== undefined) {
      if (char === lower) {
        result += mapped;
      } else if (char === char.toUpperCase()) {
        result += mapped.toUpperCase();
      } else {
        result += toTitleCase(mapped);
      }
      continue;
    }
    const simplified = basicNormalize(lower);
    if (simplified !== lower) {
      const fallbackMapped = CHARACTER_MAP.get(simplified);
      if (fallbackMapped !== undefined) {
        if (char === lower) {
          result += fallbackMapped;
        } else if (char === char.toUpperCase()) {
          result += fallbackMapped.toUpperCase();
        } else {
          result += toTitleCase(fallbackMapped);
        }
        continue;
      }
    }
    result += char;
  }
  return basicNormalize(result);
};

export const normalizeForSearch = (value: string): string =>
  finalizeNormalized(transliterate(value));

export const matchesSearchQuery = (
  query: string,
  candidate: string,
  normalizedCandidate?: string,
): boolean => {
  if (!query) return true;
  const trimmedQuery = query.trim();
  if (!trimmedQuery) return true;

  const lowerQuery = trimmedQuery.toLowerCase();
  const candidateLower = candidate.toLowerCase();
  if (lowerQuery && candidateLower.includes(lowerQuery)) {
    return true;
  }

  const normalizedQuery = normalizeForSearch(trimmedQuery);
  if (!normalizedQuery) return true;

  const normalizedTarget = normalizedCandidate ?? normalizeForSearch(candidate);
  if (!normalizedTarget) return false;

  const tokens = normalizedQuery.split(' ').filter(Boolean);
  if (tokens.length === 0) {
    return normalizedTarget.includes(normalizedQuery);
  }
  return tokens.every(token => normalizedTarget.includes(token));
};

let workerSetupPromise: Promise<Worker> | null = null;
let workerInstance: Worker | null = null;
let requestId = 0;
const pending = new Map<
  number,
  { resolve: (value: string[]) => void; reject: (error: Error) => void }
>();

const shouldUseWorker = (values: readonly string[]): boolean => {
  if (typeof window === 'undefined' || typeof window.Worker === 'undefined') {
    return false;
  }
  const totalLength = values.reduce((sum, value) => sum + value.length, 0);
  return totalLength >= 256;
};

const getWorker = async (): Promise<Worker> => {
  if (workerInstance) return workerInstance;
  if (!workerSetupPromise) {
    workerSetupPromise = new Promise((resolve, reject) => {
      try {
        const worker = new Worker(
          new URL('../../workers/transliterate.worker.ts', import.meta.url),
        );
        worker.addEventListener('message', event => {
          const data = event.data as
            | { id: number; type: 'result'; payload: string[] }
            | { id: number; type: 'error'; error: string };
          if (!data || typeof data !== 'object' || typeof (data as any).id !== 'number') {
            return;
          }
          const handler = pending.get(data.id);
          if (!handler) {
            return;
          }
          pending.delete(data.id);
          if (data.type === 'result') {
            handler.resolve(data.payload);
          } else {
            handler.reject(new Error(data.error));
          }
        });
        worker.addEventListener('error', event => {
          const error = new Error(event.message || 'Transliteration worker error');
          pending.forEach(handler => handler.reject(error));
          pending.clear();
          workerInstance?.terminate();
          workerInstance = null;
          workerSetupPromise = null;
        });
        workerInstance = worker;
        resolve(worker);
      } catch (error) {
        reject(error instanceof Error ? error : new Error('Failed to create worker'));
      }
    });
  }
  return workerSetupPromise;
};

export const transliterateBulk = async (
  values: readonly string[],
): Promise<string[]> => {
  if (values.length === 0) {
    return [];
  }
  if (!shouldUseWorker(values)) {
    return values.map(transliterate);
  }
  try {
    const worker = await getWorker();
    const id = ++requestId;
    return await new Promise<string[]>((resolve, reject) => {
      pending.set(id, { resolve, reject });
      worker.postMessage({ id, type: 'bulk', payload: values });
    });
  } catch (error) {
    console.warn('Falling back to synchronous transliteration', error);
    return values.map(transliterate);
  }
};

export const releaseTransliterationWorker = () => {
  if (workerInstance) {
    workerInstance.terminate();
  }
  workerInstance = null;
  workerSetupPromise = null;
  pending.clear();
};
