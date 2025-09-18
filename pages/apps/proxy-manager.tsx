import dynamic from "next/dynamic";

const ProxyManagerApp = dynamic(
  () =>
    import("../../apps/proxy-manager").catch((err) => {
      console.error("Failed to load Proxy Manager app", err);
      throw err;
    }),
  {
    ssr: false,
    loading: () => <p>Loading...</p>,
  }
);

export default ProxyManagerApp;
