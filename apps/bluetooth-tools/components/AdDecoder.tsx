import React, { useState } from "react";

interface Field {
  type: number;
  typeName: string;
  valueHex: string;
  valueText?: string;
}

const TYPE_NAMES: Record<number, string> = {
  0x01: "Flags",
  0x02: "Incomplete 16-bit Service UUIDs",
  0x03: "Complete 16-bit Service UUIDs",
  0x04: "Incomplete 32-bit Service UUIDs",
  0x05: "Complete 32-bit Service UUIDs",
  0x06: "Incomplete 128-bit Service UUIDs",
  0x07: "Complete 128-bit Service UUIDs",
  0x08: "Shortened Local Name",
  0x09: "Complete Local Name",
  0x0a: "Tx Power Level",
  0xff: "Manufacturer Specific Data",
};

const AdDecoder: React.FC = () => {
  const [hex, setHex] = useState("");
  const [fields, setFields] = useState<Field[]>([]);
  const [error, setError] = useState("");

  const parse = () => {
    const clean = hex.replace(/[^a-fA-F0-9]/g, "");
    if (clean.length % 2 !== 0) {
      setError("Invalid hex string.");
      setFields([]);
      return;
    }

    const bytes: number[] = [];
    for (let i = 0; i < clean.length; i += 2) {
      bytes.push(parseInt(clean.substring(i, i + 2), 16));
    }

    const result: Field[] = [];
    for (let i = 0; i < bytes.length; ) {
      const len = bytes[i];
      if (len === 0 || i + len >= bytes.length + 1) {
        break;
      }
      const type = bytes[i + 1];
      const data = bytes.slice(i + 2, i + 1 + len);
      const valueHex = data
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
      let valueText: string | undefined;
      if (type === 0x08 || type === 0x09) {
        valueText = data.map((b) => String.fromCharCode(b)).join("");
      }
      result.push({
        type,
        typeName: TYPE_NAMES[type] || "Unknown",
        valueHex,
        valueText,
      });
      i += len + 1;
    }
    setFields(result);
    setError("");
  };

  const copy = (text: string) => {
    void navigator.clipboard?.writeText(text);
  };

  return (
    <div className="flex h-full w-full flex-col gap-4 bg-black p-4 text-white">
      <textarea
        value={hex}
        onChange={(e) => setHex(e.target.value)}
        placeholder="Enter hex bytes..."
        className="h-32 w-full rounded bg-gray-800 p-2 font-mono text-sm text-white"
      />
      <button
        onClick={parse}
        className="w-32 rounded bg-blue-600 px-4 py-2 font-semibold"
      >
        Decode
      </button>
      {error && <p className="text-red-500">{error}</p>}
      <div className="flex flex-col gap-2 overflow-auto">
        {fields.map((f, idx) => (
          <div
            key={idx}
            className="flex items-start justify-between rounded bg-gray-900 p-2 text-sm"
          >
            <div className="pr-2">
              <p className="font-semibold">
                {f.typeName} (0x{f.type.toString(16).padStart(2, "0")})
              </p>
              <p className="break-all font-mono">{f.valueText ?? f.valueHex}</p>
            </div>
            <button
              onClick={() => copy(f.valueText ?? f.valueHex)}
              className="ml-2 rounded bg-gray-700 px-2 py-1 text-xs"
            >
              Copy
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdDecoder;
