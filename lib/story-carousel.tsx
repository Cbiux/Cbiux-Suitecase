import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { ReactNode } from "react";

export const STORY_SIZE = { width: 1080, height: 1350 } as const;
export const STORY_SLIDE_COUNT = 7;

export const STORY_SLIDES = [
  { id: 1, file: "cbiux-historia-01-hook.png", label: "01 · Hook" },
  { id: 2, file: "cbiux-historia-02-salas.png", label: "02 · Las salas" },
  { id: 3, file: "cbiux-historia-03-estudiantes.png", label: "03 · Estudiantes" },
  { id: 4, file: "cbiux-historia-04-maleta.png", label: "04 · La maleta" },
  { id: 5, file: "cbiux-historia-05-ruta.png", label: "05 · La ruta" },
  { id: 6, file: "cbiux-historia-06-apoyo.png", label: "06 · El apoyo" },
  { id: 7, file: "cbiux-historia-07-cta.png", label: "07 · Reservá" },
] as const;

export const STORY_CAPTION = `Soy estudiante de Costa Rica. Este año voy a representar al país en Compile Amsterdam (SpaceXAI), HackMeridian en Lisboa y Devcon en India: de las hackathons y conferencias más grandes del mundo.

No voy solo por mí. Voy para abrir la puerta a más estudiantes ticos: que se vea que se puede llegar, documentar el camino y traer esas oportunidades de vuelta.

Para financiarlo vendo 22 espacios en mi maleta de cabina. Tu logo viaja conmigo. Desde $45. SINPE o USDC.

Si me ayudás, no solo viaja tu marca. Viaja la posibilidad de que más estudiantes de CR se animen.

cbiux-suitcase.vercel.app
@Cbiux_04`;

const NAVY = "#0b1b4a";
const BLUE = "#2c3fd1";
const MUTED = "#5c6478";
const CREAM = "#f7f7f4";

function glue(s: string) {
  return s.replaceAll(" ", "\u00A0");
}

async function fileSrc(name: string) {
  const file = await readFile(join(process.cwd(), "public", name));
  const mime = name.endsWith(".jpg") ? "image/jpeg" : "image/png";
  return `data:${mime};base64,${file.toString("base64")}`;
}

export async function renderStorySlide(id: number) {
  const slide = STORY_SLIDES.find((item) => item.id === id);
  if (!slide) throw new Error("SLIDE");
  const [suitcase, portrait] = await Promise.all([
    fileSrc("suitcase-front.png"),
    fileSrc("photo.jpg"),
  ]);
  return new ImageResponse(markup(id, suitcase, portrait), { ...STORY_SIZE });
}

function markup(id: number, suitcase: string, portrait: string) {
  if (id === 1) return slideHook(portrait);
  if (id === 2) return slideStages();
  if (id === 3) return slideStudents();
  if (id === 4) return slideIdea(suitcase);
  if (id === 5) return slideRoute();
  if (id === 6) return slideGets();
  return slideCta();
}

function Frame({
  n,
  kicker,
  children,
}: {
  n: number;
  kicker: string;
  children: ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        background: CREAM,
        backgroundImage:
          "linear-gradient(to right, rgba(11,27,74,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(11,27,74,0.06) 1px, transparent 1px)",
        backgroundSize: "42px 42px",
        position: "relative",
      }}
    >
      <div style={{ display: "flex", width: 18, height: "100%", background: BLUE, position: "absolute", left: 0, top: 0 }} />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          padding: "56px 64px 48px 72px",
        }}
      >
        <Header kicker={kicker} />
        <div style={{ display: "flex", flexDirection: "column", flex: 1, marginTop: 36 }}>{children}</div>
        <Footer n={n} />
      </div>
    </div>
  );
}

function Header({ kicker }: { kicker: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <div style={{ display: "flex", alignItems: "center" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 44,
            height: 44,
            borderRadius: 10,
            background: BLUE,
            color: "#fff",
            fontSize: 14,
            fontWeight: 700,
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
            color: NAVY,
          }}
        >
          cbiux
        </div>
      </div>
      <div
        style={{
          display: "flex",
          fontSize: 16,
          fontWeight: 700,
          letterSpacing: 2.4,
          color: MUTED,
        }}
      >
        {glue(kicker)}
      </div>
    </div>
  );
}

function Footer({ n }: { n: number }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 28 }}>
      <div style={{ display: "flex", fontSize: 22, fontWeight: 700, color: BLUE }}>@Cbiux_04</div>
      <div style={{ display: "flex", fontSize: 20, fontWeight: 600, color: MUTED }}>
        {glue(`${String(n).padStart(2, "0")} / ${String(STORY_SLIDE_COUNT).padStart(2, "0")}`)}
      </div>
    </div>
  );
}

const TEXT = { display: "flex", alignSelf: "flex-start", whiteSpace: "nowrap" } as const;

function Title({ lines, accent }: { lines: string[]; accent?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {lines.map((line) => (
        <div
          key={line}
          style={{
            ...TEXT,
            fontSize: 52,
            fontWeight: 800,
            lineHeight: 1.06,
            letterSpacing: -1.2,
            color: NAVY,
          }}
        >
          {glue(line)}
        </div>
      ))}
      {accent ? (
        <div
          style={{
            ...TEXT,
            fontSize: 52,
            fontWeight: 800,
            lineHeight: 1.06,
            letterSpacing: -1.2,
            color: BLUE,
          }}
        >
          {glue(accent)}
        </div>
      ) : null}
    </div>
  );
}

function Body({ lines }: { lines: string[] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", marginTop: 20 }}>
      {lines.map((line) => (
        <div
          key={line}
          style={{
            ...TEXT,
            fontSize: 28,
            lineHeight: 1.3,
            color: MUTED,
          }}
        >
          {glue(line)}
        </div>
      ))}
    </div>
  );
}

function Row({ n, title, note }: { n: string; title: string; note?: string }) {
  return (
    <div
      style={{
        display: "flex",
        marginTop: 14,
        padding: "18px 22px",
        background: "#fff",
        borderRadius: 22,
        alignItems: "flex-start",
      }}
    >
      <div
        style={{
          display: "flex",
          width: 56,
          fontSize: 20,
          fontWeight: 700,
          letterSpacing: 1.4,
          color: BLUE,
        }}
      >
        {n}
      </div>
      <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
        <div style={{ ...TEXT, fontSize: 28, fontWeight: 700, color: NAVY }}>{glue(title)}</div>
        {note ? (
          <div style={{ ...TEXT, marginTop: 4, fontSize: 22, color: MUTED }}>{glue(note)}</div>
        ) : null}
      </div>
    </div>
  );
}

function slideHook(portrait: string) {
  return (
    <Frame n={1} kicker="ESTUDIANTE · CR · 2026">
      <Title lines={["Soy estudiante."]} accent="Represento a CR." />
      <Body
        lines={[
          "Conferencias y hackathons",
          "más grandes del mundo.",
          "Maleta de cabina y vlog diario.",
        ]}
      />
      <div
        style={{
          display: "flex",
          marginTop: 24,
          height: 620,
          borderRadius: 32,
          overflow: "hidden",
          background: "#d7d5cf",
        }}
      >
        <img src={portrait} alt="" width={936} height={620} style={{ objectFit: "cover" }} />
      </div>
    </Frame>
  );
}

function slideStages() {
  return (
    <Frame n={2} kicker="A DÓNDE VOY">
      <Title lines={["A representar"]} accent="al país allá." />
      <Body lines={["No es turismo. Es estar en las salas", "donde se decide el futuro tech."]} />
      <div style={{ display: "flex", flexDirection: "column", marginTop: 22 }}>
        <Row n="01" title="Compile Amsterdam" note="La conferencia de SpaceXAI." />
        <Row n="02" title="HackMeridian Lisboa" note="Una de las hackathons más importantes." />
        <Row n="03" title="Devcon India" note="Una de las conferencias más grandes." />
        <Row n="04" title="Vlog diario" note="El camino queda documentado." />
      </div>
    </Frame>
  );
}

function slideStudents() {
  return (
    <Frame n={3} kicker="POR QUÉ PIDO AYUDA">
      <Title lines={["Quiero abrir"]} accent="la puerta a más." />
      <Body
        lines={[
          "Si un estudiante de CR llega,",
          "otros pueden verse ahí.",
        ]}
      />
      <div style={{ display: "flex", flexDirection: "column", marginTop: 22 }}>
        <Row n="01" title="Llevar a Costa Rica a esas salas" />
        <Row n="02" title="Documentar el camino en vlog diario" />
        <Row n="03" title="Traer oportunidades de vuelta" />
        <Row n="04" title="Que más estudiantes se animen" />
      </div>
    </Frame>
  );
}

function slideIdea(suitcase: string) {
  return (
    <Frame n={4} kicker="CÓMO SE FINANCIA">
      <Title lines={["Vendo espacio"]} accent="en mi maleta." />
      <Body
        lines={[
          "22 posiciones en cabina 55 × 40 × 20.",
          "Tu logo viaja. Más estudiantes se animan.",
        ]}
      />
      <div
        style={{
          display: "flex",
          marginTop: 28,
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          background: "#fff",
          borderRadius: 32,
        }}
      >
        <img src={suitcase} alt="" width={420} height={484} style={{ objectFit: "contain" }} />
      </div>
      <div style={{ display: "flex", marginTop: 24 }}>
        <Stat value="22" label="POSICIONES" />
        <Stat value="$45" label="DESDE" />
        <Stat value="3" label="PIEZAS" />
      </div>
    </Frame>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", marginRight: 48 }}>
      <div style={{ display: "flex", fontSize: 42, fontWeight: 800, color: NAVY }}>{value}</div>
      <div style={{ display: "flex", marginTop: 4, fontSize: 14, fontWeight: 700, letterSpacing: 2, color: MUTED }}>
        {glue(label)}
      </div>
    </div>
  );
}

function slideRoute() {
  const left = [
    "San José · salida",
    "Ámsterdam · Compile",
    "Bruselas · Brujas de día",
    "Colonia · Berlín",
    "Praga · Pforzheim",
    "Nyon / Gland",
  ];
  const right = [
    "Madrid · Lisboa",
    "Dubái · escala",
    "Mumbai · Devcon",
    "Delhi · Agra",
    "Mumbai · salida",
    "Vuelta a Costa Rica",
  ];
  return (
    <Frame n={5} kicker="LA RUTA">
      <Title lines={["La ruta de"]} accent="un estudiante." />
      <Body lines={["De San José a Compile, Lisboa e India.", "El vlog lo sigue todos los días."]} />
      <div style={{ display: "flex", marginTop: 36 }}>
        <div style={{ display: "flex", flexDirection: "column", width: 460 }}>
          {left.map((line) => (
            <div key={line} style={{ ...TEXT, marginTop: 16, fontSize: 26, fontWeight: 600, color: NAVY }}>
              {glue(line)}
            </div>
          ))}
        </div>
        <div style={{ display: "flex", flexDirection: "column", width: 460 }}>
          {right.map((line) => (
            <div key={line} style={{ ...TEXT, marginTop: 16, fontSize: 26, fontWeight: 600, color: NAVY }}>
              {glue(line)}
            </div>
          ))}
        </div>
      </div>
    </Frame>
  );
}

function slideGets() {
  return (
    <Frame n={6} kicker="QUÉ RECIBÍS">
      <Title lines={["Ayudás a un"]} accent="estudiante tico." />
      <Body lines={["Tu marca viaja. Más estudiantes", "de CR ven que se puede llegar."]} />
      <div style={{ display: "flex", flexDirection: "column", marginTop: 22 }}>
        <Row n="01" title="Tu logo en cabina" note="De San José a Devcon, no en bodega." />
        <Row n="02" title="Vlog diario" note="Compile, Lisboa e India." />
        <Row n="03" title="Tag de sponsor" note="Agradecimiento en X y LinkedIn." />
        <Row n="04" title="Impacto real" note="Abrís la puerta a más estudiantes." />
      </div>
    </Frame>
  );
}

function slideCta() {
  return (
    <Frame n={7} kicker="RESERVÁ UN SPOT">
      <Title lines={["Apoyá a un"]} accent="estudiante tico." />
      <Body
        lines={["22 posiciones. Desde $45.", "Cierre el 10 de octubre de 2026 o al agotarse."]}
      />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          marginTop: 48,
          padding: "36px 36px",
          background: NAVY,
          borderRadius: 32,
        }}
      >
        <div style={{ ...TEXT, fontSize: 22, fontWeight: 700, letterSpacing: 2, color: "#9db0ff" }}>
          {glue("RESERVÁ ACÁ")}
        </div>
        <div style={{ ...TEXT, marginTop: 14, fontSize: 36, fontWeight: 800, color: "#fff" }}>
          cbiux-suitcase.vercel.app
        </div>
        <div style={{ ...TEXT, marginTop: 18, fontSize: 24, color: "#c9d2ff" }}>
          {glue("SINPE Móvil · USDC EVM · USDC Stellar")}
        </div>
      </div>
      <div style={{ display: "flex", marginTop: 40 }}>
        <Stat value="22" label="POSICIONES" />
        <Stat value="$45" label="DESDE" />
        <Stat value="CR" label="EN ESAS SALAS" />
      </div>
    </Frame>
  );
}
