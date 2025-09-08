import dynamic from "next/dynamic";
import { baseMetadata } from "../lib/metadata";
import BetaBadge from "../components/BetaBadge";
import useSession from "../hooks/useSession";

export const metadata = baseMetadata;

const Ubuntu = dynamic(
  () =>
    import("../components/screen/ubuntu").catch((err) => {
      console.error("Failed to load Ubuntu component", err);
      throw err;
    }),
  {
    ssr: false,
    loading: () => <p>Loading Ubuntu...</p>,
  },
);
const InstallButton = dynamic(
  () =>
    import("../components/InstallButton").catch((err) => {
      console.error("Failed to load InstallButton component", err);
      throw err;
    }),
  {
    ssr: false,
    loading: () => <p>Loading install options...</p>,
  },
);

const App = (): JSX.Element => {
  const { session, setSession, resetSession } = useSession();
  return (
    <>
      <a href="#window-area" className="sr-only focus:not-sr-only">
        Skip to content
      </a>
      <Ubuntu
        session={session}
        setSession={setSession}
        resetSession={resetSession}
      />
      <BetaBadge />
      <InstallButton />
      <section className="prose p-tight">
        <h1 className="leading-tight">Sample Heading</h1>
        <ul className="space-y-tight">
          <li>First item</li>
          <li>Second item</li>
        </ul>
        <pre className="leading-tight p-tight">
          <code>{`const greet = (name: string) => {
  console.log('Hello, ' + name);
};`}</code>
        </pre>
      </section>
    </>
  );
};

export default App;
