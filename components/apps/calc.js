// Ensure decimal.js wrapper is bundled for precise arithmetic
import '@/utils/decimal';

// Re-export calculator helpers from archived source
export { default, evaluateExpression, displayTerminalCalc } from './archive/Calc';
