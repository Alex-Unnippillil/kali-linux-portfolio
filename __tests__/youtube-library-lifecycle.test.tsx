import { act, renderHook, waitFor } from "@testing-library/react";
import useYouTubeLibrary from "../hooks/useYouTubeLibrary";
const response = (title: string) =>
  new Response(
    JSON.stringify({
      summary: { id: title, title, thumbnail: "" },
      directory: { playlists: [], sections: [] },
    }),
  );
afterEach(() => jest.restoreAllMocks());
test("ignores a stale directory response when switching channels", async () => {
  let resolveFirst!: (value: Response) => void;
  const pending = new Promise<Response>((resolve) => {
    resolveFirst = resolve;
  });
  const fetchMock = jest
    .spyOn(global, "fetch")
    .mockImplementation(async (input) =>
      String(input).includes("first-channel")
        ? pending
        : response("Second channel"),
    );
  const { result, rerender } = renderHook(
    ({ channel }) => useYouTubeLibrary(channel),
    { initialProps: { channel: "first-channel" } },
  );
  rerender({ channel: "second-channel" });
  await waitFor(() =>
    expect(result.current.summary?.title).toBe("Second channel"),
  );
  await act(async () => resolveFirst(response("Stale channel")));
  expect(result.current.summary?.title).toBe("Second channel");
  expect((fetchMock.mock.calls[0][1]?.signal as AbortSignal).aborted).toBe(
    true,
  );
});
test("closing YouTube cancels outstanding requests and ignores their late responses", async () => {
  let resolveRequest!: (value: Response) => void;
  const fetchMock = jest.spyOn(global, "fetch").mockImplementation(
    () => new Promise((resolve) => { resolveRequest = resolve; }),
  );
  const { result, unmount } = renderHook(() => useYouTubeLibrary("channel"));
  expect(result.current.loadingDirectory).toBe(true);
  expect(fetchMock).toHaveBeenCalledTimes(1);
  unmount();
  expect((fetchMock.mock.calls[0][1]?.signal as AbortSignal).aborted).toBe(true);
  await act(async () => resolveRequest(response("Late channel")));
  expect(result.current.directory).toBeNull();
});

test("a stalled API request ends with a retryable error instead of an endless spinner", async () => {
  jest.useFakeTimers();
  const fetchMock = jest.spyOn(global, "fetch").mockImplementation(
    (_input, options) =>
      new Promise((_resolve, reject) => {
        options?.signal?.addEventListener("abort", () =>
          reject(new DOMException("Aborted", "AbortError")),
        );
      }),
  );
  try {
    const { result, unmount } = renderHook(() =>
      useYouTubeLibrary("channel"),
    );
    await act(async () => {
      await jest.advanceTimersByTimeAsync(20001);
    });
    expect(result.current.directoryError).toMatch(/too long/);
    expect(result.current.loadingDirectory).toBe(false);
    expect((fetchMock.mock.calls[0][1]?.signal as AbortSignal).aborted).toBe(
      true,
    );
    unmount();
  } finally {
    jest.useRealTimers();
  }
});
