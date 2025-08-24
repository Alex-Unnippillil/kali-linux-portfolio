export const TEMPLATES = {
  classic: {
    card: 'bg-gray-800 text-white',
    quote: 'text-2xl font-serif italic leading-relaxed mb-4',
    author: 'text-lg font-semibold text-gray-300',
    og: { background: '#1f2937', color: '#f3f4f6' },
  },
  light: {
    card: 'bg-white text-gray-800',
    quote: 'text-2xl font-serif italic leading-relaxed mb-4',
    author: 'text-lg font-semibold text-gray-600',
    og: { background: '#ffffff', color: '#1f2937' },
  },
  sunset: {
    card: 'bg-gradient-to-br from-pink-500 to-orange-500 text-white',
    quote: 'text-2xl font-serif italic leading-relaxed mb-4',
    author: 'text-lg font-semibold text-white/90',
    og: {
      background: 'linear-gradient(135deg, #ec4899, #f97316)',
      color: '#ffffff',
    },
  },
};
export const DEFAULT_TEMPLATE = 'classic';
