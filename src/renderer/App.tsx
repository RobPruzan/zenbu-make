import { ZenbuProvider } from "@zenbujs/core/react";
import { UpdateStatus } from "./UpdateStatus";

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
  return (
    <main
      style={{
        flex: 1,
        padding: "0 32px 32px",
        fontFamily: "system-ui, -apple-system, sans-serif",
        color: "var(--foreground, #e5e5e5)",
      }}
    >
      <h1>Welcome to Zenbu Make</h1>
    </main>
  );
}

export function App() {
  return (
    <ZenbuProvider>
      <div
        style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}
      >
        <Titlebar />
        <Home />
        <UpdateStatus />
      </div>
    </ZenbuProvider>
  );
}
