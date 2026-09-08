import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const ogSize = { width: 1200, height: 630 };
export const promoSize = { width: 1080, height: 1080 };
export const ogAlt =
  "cbiux: 22 posiciones en una maleta de cabina rumbo a Europa e India. Desde $45.";

const SPOTS = [
  { id: "01", left: "23.8%", top: "29.4%", width: "52.8%", height: "12.4%" },
  { id: "02", left: "23.8%", top: "43%", width: "25.7%", height: "13.9%" },
  { id: "03", left: "50.9%", top: "43%", width: "25.7%", height: "13.9%" },
  { id: "04", left: "23.8%", top: "57.8%", width: "25.7%", height: "13.9%" },
  { id: "05", left: "50.9%", top: "57.8%", width: "25.7%", height: "13.9%" },
  { id: "19", left: "23.8%", top: "72.6%", width: "25.7%", height: "13.9%" },
  { id: "20", left: "50.9%", top: "72.6%", width: "25.7%", height: "13.9%" },
] as const;

async function suitcaseSrc() {
  const file = await readFile(join(process.cwd(), "public/suitcase-front.png"));
  return `data:image/png;base64,${file.toString("base64")}`;
}

function Logo() {
  return (
    <div style={{ display: "flex", alignItems: "center" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 44,
          height: 44,
          borderRadius: 10,
          background: "#2c3fd1",
          color: "#fff",
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: 1,
        }}
      >
        C
      </div>
      <div
        style={{
          display: "flex",
          marginLeft: 12,
          fontSize: 22,
          fontWeight: 800,
          letterSpacing: 4,
          color: "#0b1b4a",
        }}
      >
        cbiux
      </div>
    </div>
  );
}

function Headline({ large }: { large?: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <div
        style={{
          display: "flex",
          fontSize: large ? 64 : 54,
          fontWeight: 800,
          lineHeight: 1.02,
          letterSpacing: -1.6,
          color: "#0b1b4a",
        }}
      >
        Tu marca, en mi ruta a
      </div>
      <div
        style={{
          display: "flex",
          fontSize: large ? 64 : 54,
          fontWeight: 800,
          lineHeight: 1.02,
          letterSpacing: -1.6,
          color: "#2c3fd1",
        }}
      >
        Europa e India
      </div>
    </div>
  );
}

function Stats({ compact }: { large?: boolean; compact?: boolean }) {
  const items = [
    { value: "22", label: "POSICIONES" },
    { value: "$45", label: "DESDE" },
    { value: "3", label: "PIEZAS" },
  ];
  return (
    <div style={{ display: "flex" }}>
      {items.map((item, index) => (
        <div
          key={item.label}
          style={{
            display: "flex",
            flexDirection: "column",
            marginRight: compact ? 36 : 48,
            marginLeft: index === 0 ? 0 : 0,
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: compact ? 36 : 42,
              fontWeight: 800,
              color: "#0b1b4a",
            }}
          >
            {item.value}
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 4,
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: 2.2,
              color: "#5c6478",
            }}
          >
            {item.label}
          </div>
        </div>
      ))}
    </div>
  );
}

function Suitcase({ src, height }: { src: string; height: number }) {
  const width = Math.round(height * 0.867);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: width + 24,
        height: height + 24,
        background: "#ffffff",
        borderRadius: 28,
      }}
    >
      <div
        style={{
          display: "flex",
          position: "relative",
          width,
          height,
        }}
      >
        <img src={src} alt="" width={width} height={height} style={{ objectFit: "contain" }} />
        {SPOTS.map((spot) => (
          <div
            key={spot.id}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "absolute",
              left: spot.left,
              top: spot.top,
              width: spot.width,
              height: spot.height,
              background: "rgba(255,255,255,0.94)",
              border: "1px solid #2c3fd1",
              borderRadius: 8,
              color: "#0b1b4a",
              fontSize: 14,
              fontWeight: 800,
            }}
          >
            {spot.id}
          </div>
        ))}
      </div>
    </div>
  );
}

export async function renderOgImage() {
  const src = await suitcaseSrc();
  return new ImageResponse(
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        background: "#f7f7f4",
        backgroundImage:
          "linear-gradient(to right, rgba(11,27,74,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(11,27,74,0.06) 1px, transparent 1px)",
        backgroundSize: "42px 42px",
        padding: "48px 56px",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          width: 620,
        }}
      >
        <Logo />
        <div style={{ display: "flex", marginTop: 28 }}>
          <Headline />
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 18,
            fontSize: 22,
            lineHeight: 1.35,
            color: "#5c6478",
            maxWidth: 560,
          }}
        >
          22 spots en mi maleta de cabina. Vlog diario de Costa Rica a Devcon.
        </div>
        <div style={{ display: "flex", marginTop: 28 }}>
          <Stats />
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 28,
            fontSize: 16,
            fontWeight: 700,
            letterSpacing: 1.6,
            color: "#2c3fd1",
          }}
        >
          SINPE · USDC · cbiux-suitcase.vercel.app
        </div>
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          justifyContent: "center",
          flex: 1,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginBottom: 12,
            fontSize: 14,
            fontWeight: 700,
            letterSpacing: 2,
            color: "#147a4b",
          }}
        >
          ● 22 SPOTS AVAILABLE
        </div>
        <Suitcase src={src} height={520} />
      </div>
    </div>,
    { ...ogSize },
  );
}

export async function renderPromoImage() {
  const src = await suitcaseSrc();
  return new ImageResponse(
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        background: "#f7f7f4",
        backgroundImage:
          "linear-gradient(to right, rgba(11,27,74,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(11,27,74,0.06) 1px, transparent 1px)",
        backgroundSize: "42px 42px",
        padding: 56,
      }}
    >
      <Logo />
      <div style={{ display: "flex", marginTop: 28 }}>
        <Headline large />
      </div>
      <div
        style={{
          display: "flex",
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          marginTop: 12,
        }}
      >
        <Suitcase src={src} height={560} />
      </div>
      <div style={{ display: "flex", marginTop: 8 }}>
        <Stats compact />
      </div>
      <div
        style={{
          display: "flex",
          marginTop: 20,
          fontSize: 18,
          fontWeight: 700,
          letterSpacing: 1.4,
          color: "#2c3fd1",
        }}
      >
        SINPE · USDC · cbiux-suitcase.vercel.app
      </div>
    </div>,
    { ...promoSize },
  );
}
