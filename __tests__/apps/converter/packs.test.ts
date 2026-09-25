import { basePack, hashingPack, unitsPack } from "../../../apps/converter/packs";

describe("unitsPack", () => {
  const currencyCategory = unitsPack.categories.find(
    (category) => category.id === "currency",
  );
  const lengthCategory = unitsPack.categories.find(
    (category) => category.id === "length",
  );
  const weightCategory = unitsPack.categories.find(
    (category) => category.id === "weight",
  );

  it("converts currency using reference rates", async () => {
    expect(currencyCategory).toBeDefined();
    const result = await unitsPack.convert({
      value: "10",
      fromUnit: "USD",
      toUnit: "EUR",
      category: currencyCategory!,
      direction: "forward",
    });

    expect(parseFloat(result)).toBeCloseTo(9, 5);
  });

  it("converts between length measurements", async () => {
    expect(lengthCategory).toBeDefined();
    const result = await unitsPack.convert({
      value: "1",
      fromUnit: "meter",
      toUnit: "centimeter",
      category: lengthCategory!,
      direction: "forward",
    });

    expect(result).toBe("100");
  });

  it("converts between weight measurements", async () => {
    expect(weightCategory).toBeDefined();
    const result = await unitsPack.convert({
      value: "2",
      fromUnit: "kilogram",
      toUnit: "pound",
      category: weightCategory!,
      direction: "forward",
    });

    expect(parseFloat(result)).toBeCloseTo(4.409245, 5);
  });
});

describe("basePack", () => {
  const baseCategory = basePack.categories[0];

  it("converts binary to decimal", async () => {
    const result = await basePack.convert({
      value: "1010",
      fromUnit: "binary",
      toUnit: "decimal",
      category: baseCategory,
      direction: "forward",
    });

    expect(result).toBe("10");
  });

  it("returns empty string for invalid digits", async () => {
    const result = await basePack.convert({
      value: "2",
      fromUnit: "binary",
      toUnit: "decimal",
      category: baseCategory,
      direction: "forward",
    });

    expect(result).toBe("");
  });
});

describe("hashingPack", () => {
  const hashingCategory = hashingPack.categories[0];

  it("computes MD5 hashes deterministically", async () => {
    const first = await hashingPack.convert({
      value: "hello",
      fromUnit: "plaintext",
      toUnit: "md5",
      category: hashingCategory,
      direction: "forward",
    });

    const second = await hashingPack.convert({
      value: "hello",
      fromUnit: "plaintext",
      toUnit: "md5",
      category: hashingCategory,
      direction: "forward",
    });

    expect(first).toBe("5d41402abc4b2a76b9719d911017c592");
    expect(second).toBe(first);
  });

  it("returns an empty string when given no input", async () => {
    const result = await hashingPack.convert({
      value: "",
      fromUnit: "plaintext",
      toUnit: "sha256",
      category: hashingCategory,
      direction: "forward",
    });

    expect(result).toBe("");
  });
});
