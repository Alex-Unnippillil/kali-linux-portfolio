import * as capstoneWasm from 'capstone-wasm';

// Shim module to normalize capstone-wasm exports across CJS/ESM builds.
// If the upstream package stabilizes its export shape, delete this wrapper
// and import the package directly again.
type CapstoneModule = typeof capstoneWasm & {
  default?: typeof capstoneWasm;
};

const normalized = (capstoneWasm as CapstoneModule).default ?? capstoneWasm;

const { Capstone, Const, loadCapstone } = normalized;

export { Capstone, Const, loadCapstone };
export default Capstone;
