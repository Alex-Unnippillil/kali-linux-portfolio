import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import FormatConvert, { checkAvifSupport } from "../../../apps/image-tools/components/FormatConvert";
import { convertFile } from "../../../apps/image-tools/utils/canvas";
import type { ConversionTarget } from "../../../apps/image-tools/utils/canvas";

jest.mock("../../../apps/image-tools/utils/canvas", () => ({
  convertFile: jest.fn(),
}));

const mockedConvertFile = convertFile as jest.MockedFunction<typeof convertFile>;

const originalCreateImageBitmap = globalThis.createImageBitmap;
const originalCreateObjectURL = URL.createObjectURL;
const originalRevokeObjectURL = URL.revokeObjectURL;

function makeFileList(files: File[]): FileList {
  const fileList: Partial<FileList> = {
    length: files.length,
    item: (index: number) => files[index] ?? null,
    [Symbol.iterator]: function* () {
      yield* files;
    },
  };
  files.forEach((file, index) => {
    (fileList as any)[index] = file;
  });
  return fileList as FileList;
}

beforeAll(() => {
  global.URL.createObjectURL = jest.fn(() => `blob:mock-${Math.random()}`);
  global.URL.revokeObjectURL = jest.fn();
});

afterAll(() => {
  global.URL.createObjectURL = originalCreateObjectURL;
  global.URL.revokeObjectURL = originalRevokeObjectURL;
  globalThis.createImageBitmap = originalCreateImageBitmap;
});

afterEach(() => {
  mockedConvertFile.mockReset();
});

describe("checkAvifSupport", () => {
  it("returns false when createImageBitmap is unavailable", async () => {
    (globalThis as any).createImageBitmap = undefined;
    await expect(checkAvifSupport()).resolves.toBe(false);
  });

  it("resolves true when createImageBitmap can process an AVIF blob", async () => {
    const close = jest.fn();
    (globalThis as any).createImageBitmap = jest.fn().mockResolvedValue({ close });
    await expect(checkAvifSupport()).resolves.toBe(true);
    expect(globalThis.createImageBitmap).toHaveBeenCalled();
    expect(close).toHaveBeenCalled();
  });
});

describe("FormatConvert component", () => {
  it("shows fallback messaging when AVIF is not supported", async () => {
    (globalThis as any).createImageBitmap = undefined;
    render(<FormatConvert />);
    expect(
      await screen.findByText(
        /does not support AVIF via createImageBitmap/i,
      ),
    ).toBeInTheDocument();
  });

  it("lists converted file sizes after conversion", async () => {
    (globalThis as any).createImageBitmap = jest
      .fn()
      .mockRejectedValue(new Error("unsupported"));

    mockedConvertFile.mockImplementation(
      async (file: File, mime: ConversionTarget, _quality: number) => {
        const convertedBytes = Math.max(1, Math.floor(file.size / 2));
        const extension =
          mime === "image/png" ? "png" : mime === "image/jpeg" ? "jpg" : "webp";
        const name = `${file.name.replace(/\.[^/.]+$/, "")}.${extension}`;
        return {
          name,
          blob: new Blob([new Uint8Array(convertedBytes)], { type: mime }),
          originalBytes: file.size,
          convertedBytes,
          mime,
        };
      },
    );

    render(<FormatConvert />);

    const fileInput = screen.getByLabelText(/upload images/i) as HTMLInputElement;
    const first = new File([new Uint8Array(1024)], "first.png", { type: "image/png" });
    const second = new File([new Uint8Array(2048)], "second.png", { type: "image/png" });
    const fileList = makeFileList([first, second]);
    fireEvent.change(fileInput, { target: { files: fileList } });

    fireEvent.change(screen.getByLabelText(/output format/i), {
      target: { value: "image/jpeg" },
    });

    fireEvent.click(screen.getByRole("button", { name: /convert images/i }));

    await waitFor(() => expect(mockedConvertFile).toHaveBeenCalledTimes(2));

    expect(
      screen.getByText(/Original: 1.00 KB → Converted: 512 B/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Original: 2.00 KB → Converted: 1.00 KB/),
    ).toBeInTheDocument();
  });
});
