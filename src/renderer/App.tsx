import { useRpc, ZenbuProvider } from "@zenbujs/core/react";
import { UpdateStatus } from "./UpdateStatus";
import { useEffect, useState } from "react";
import Confetti from "react-confetti"; // add confetti package
import { useWindowSize } from "react-use"; // handy hook for sizing

function Titlebar() {
  return (
    <div
      style={{
        height: 40,
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-end",
        padding: "0 12px 0 72px",
        // @ts-expect-error webkit property
        WebkitAppRegion: "drag",
        flexShrink: 0,
      }}
    />
  );
}

function Home() {
  const rpc = useRpc();
  const [cwd, setCwd] = useState("not yet");
  useEffect(() => {
    rpc.app.getCwd().then((cwd) => {
      setCwd(cwd);
    });
  }, []);
  return (
    <main
      style={{
        flex: 1,
        padding: "0 32px 32px",
        fontFamily: "system-ui, -apple-system, sans-serif",
        color: "var(--foreground, #e5e5e5)",
      }}
    >
      {cwd}
      <h1>Welcome to Zenbu Make update pls</h1>
    </main>
  );
}

export function App() {
  // Use window size for confetti full bleed
  const { width, height } = useWindowSize();
  // Example: show confetti when the component mounts for demonstration
  // In practice, ideally you show it on some event like successful update
  const [showConfetti, setShowConfetti] = useState(true);

  useEffect(() => {
    // Automatically turn off confetti after 3s
    if (showConfetti) {
      const t = setTimeout(() => setShowConfetti(false), 3000);
      return () => clearTimeout(t);
    }
  }, [showConfetti]);

  return (
    <ZenbuProvider>
      <div
        style={{ display: "flex", flexDirection: "column", minHeight: "100vh", position: "relative" }}
      >
        {showConfetti && <Confetti width={width} height={height} />}
        <Titlebar />
        <Home />
        <UpdateStatus />
      </div>
    </ZenbuProvider>
  );
}
