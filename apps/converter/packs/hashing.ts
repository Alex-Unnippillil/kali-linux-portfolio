import { ConversionArgs, ConverterCategory, ConverterPack } from "./types";

type HashAlgorithmId = "md5" | "sha1" | "sha256" | "sha384" | "sha512";

interface HashAlgorithm {
  id: HashAlgorithmId;
  label: string;
}

const algorithms: HashAlgorithm[] = [
  { id: "md5", label: "MD5" },
  { id: "sha1", label: "SHA-1" },
  { id: "sha256", label: "SHA-256" },
  { id: "sha384", label: "SHA-384" },
  { id: "sha512", label: "SHA-512" },
];

const category: ConverterCategory = {
  id: "hashing",
  label: "Hashing",
  icon: "🔐",
  fromOptions: [{ id: "plaintext", label: "Plaintext" }],
  toOptions: algorithms.map(({ id, label }) => ({ id, label })),
  defaultFrom: "plaintext",
  defaultTo: "sha256",
};

let modulePromise: Promise<typeof import("hash-wasm")> | null = null;

const loadHashModule = async () => {
  if (!modulePromise) {
    modulePromise = import("hash-wasm");
  }
  return modulePromise;
};

const convert = async ({ value, toUnit }: ConversionArgs) => {
  if (!value) return "";
  const algorithm = algorithms.find((item) => item.id === (toUnit as HashAlgorithmId));
  if (!algorithm) {
    return "";
  }

  const wasm = await loadHashModule();

  switch (algorithm.id) {
    case "md5": {
      const hasher = await wasm.createMD5();
      hasher.init();
      hasher.update(value);
      return hasher.digest("hex");
    }
    case "sha1": {
      const hasher = await wasm.createSHA1();
      hasher.init();
      hasher.update(value);
      return hasher.digest("hex");
    }
    case "sha256": {
      const hasher = await wasm.createSHA256();
      hasher.init();
      hasher.update(value);
      return hasher.digest("hex");
    }
    case "sha384": {
      const hasher = await wasm.createSHA384();
      hasher.init();
      hasher.update(value);
      return hasher.digest("hex");
    }
    case "sha512": {
      const hasher = await wasm.createSHA512();
      hasher.init();
      hasher.update(value);
      return hasher.digest("hex");
    }
    default:
      return "";
  }
};

export const hashingPack: ConverterPack = {
  id: "hashing",
  label: "Hashing",
  icon: "🔐",
  mode: "text",
  categories: [category],
  convert,
  allowSwap: false,
  supportsReverse: false,
};
