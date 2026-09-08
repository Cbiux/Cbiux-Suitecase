"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Globe, { type GlobeMethods } from "react-globe.gl";
import {
  ACESFilmicToneMapping,
  AmbientLight,
  Color,
  DirectionalLight,
  Mesh,
  MeshPhongMaterial,
  NoColorSpace,
  SRGBColorSpace,
  SphereGeometry,
  TextureLoader,
} from "three";
import {
  PLACES,
  ROUTE_ARCS,
  ROUTE_VISITS,
  type PlaceId,
  type RouteArc,
} from "@/lib/trip-route";

type GlobeLabel = {
  id: PlaceId;
  lat: number;
  lng: number;
  text: string;
};

type TripGlobeProps = {
  labels: GlobeLabel[];
  activeIndex: number | null;
  reduceMotion: boolean;
  onSelectPlace: (id: PlaceId) => void;
};

type ArcLayer = RouteArc & { kind: "glow" | "core" };

type GlobeApi = GlobeMethods & {
  globeMaterial: () => MeshPhongMaterial;
};

const OVERVIEW = { lat: 24, lng: -8, altitude: 2.05 };
const CLOSE_ALTITUDE = 1.42;
const PRIMARY_LABELS = new Set<PlaceId>(["sjo", "ams", "mad", "lis", "dxb", "bom"]);

function findGlobeMaterial(globe: GlobeMethods): MeshPhongMaterial | null {
  const exposed = globe as GlobeApi;
  if (typeof exposed.globeMaterial === "function") {
    return exposed.globeMaterial();
  }
  let material: MeshPhongMaterial | null = null;
  globe.scene().traverse((obj) => {
    if (material) return;
    if (obj instanceof Mesh && obj.material instanceof MeshPhongMaterial) {
      material = obj.material;
    }
  });
  return material;
}

export default function TripGlobe({
  labels,
  activeIndex,
  reduceMotion,
  onSelectPlace,
}: TripGlobeProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const cloudsRef = useRef<Mesh | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [ready, setReady] = useState(false);
  const [inView, setInView] = useState(true);

  const activePlace = activeIndex == null ? null : ROUTE_VISITS[activeIndex];
  const activeCoords = activePlace ? PLACES[activePlace] : null;

  const pinLabels = useMemo(
    () => labels.filter((label) => PRIMARY_LABELS.has(label.id) || label.id === activePlace),
    [labels, activePlace],
  );

  const rings = useMemo(() => {
    if (!activeCoords) {
      return [
        { lat: PLACES.sjo.lat, lng: PLACES.sjo.lng },
        { lat: PLACES.bom.lat, lng: PLACES.bom.lng },
      ];
    }
    return [{ lat: activeCoords.lat, lng: activeCoords.lng }];
  }, [activeCoords]);

  const arcs = useMemo<ArcLayer[]>(
    () => ROUTE_ARCS.flatMap((arc) => [
      { ...arc, kind: "glow" as const },
      { ...arc, kind: "core" as const },
    ]),
    [],
  );

  const makePin = useCallback(
    (data: object) => {
      const label = data as GlobeLabel;
      const pin = document.createElement("button");
      pin.type = "button";
      pin.className = "route-globe-pin";
      pin.dataset.place = label.id;

      const dot = document.createElement("span");
      dot.className = "route-globe-dot";

      const name = document.createElement("span");
      name.className = "route-globe-name";
      name.textContent = label.text;

      pin.append(dot, name);
      pin.addEventListener("click", (event) => {
        event.stopPropagation();
        onSelectPlace(label.id);
      });
      return pin;
    },
    [onSelectPlace],
  );

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;

    const measure = () => {
      setSize({ width: el.clientWidth, height: el.clientHeight });
    };
    measure();

    const resize = new ResizeObserver(measure);
    resize.observe(el);

    const io = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { rootMargin: "160px", threshold: 0.05 },
    );
    io.observe(el);

    return () => {
      resize.disconnect();
      io.disconnect();
    };
  }, []);

  useEffect(() => {
    wrapRef.current?.querySelectorAll<HTMLElement>(".route-globe-pin").forEach((el) => {
      el.classList.toggle("is-active", el.dataset.place === activePlace);
    });
  }, [activePlace, labels, ready, size.width]);

  useEffect(() => {
    const globe = globeRef.current;
    if (!ready || !globe) return;

    const controls = globe.controls();
    controls.enableZoom = false;
    controls.enablePan = false;
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.autoRotate = !reduceMotion && activeIndex == null;
    controls.autoRotateSpeed = 0.32;
  }, [ready, reduceMotion, activeIndex]);

  useEffect(() => {
    const globe = globeRef.current;
    if (!ready || !globe) return;
    if (inView) globe.resumeAnimation();
    else globe.pauseAnimation();
  }, [inView, ready]);

  useEffect(() => {
    const globe = globeRef.current;
    if (!ready || !globe) return;
    if (activeCoords) {
      globe.pointOfView(
        { lat: activeCoords.lat, lng: activeCoords.lng, altitude: CLOSE_ALTITUDE },
        reduceMotion ? 0 : 1100,
      );
      return;
    }
    globe.pointOfView(OVERVIEW, reduceMotion ? 0 : 1100);
  }, [activeCoords, ready, reduceMotion]);

  useEffect(() => {
    const globe = globeRef.current;
    if (!ready || !globe) return;
    const renderer = globe.renderer();
    const loader = new TextureLoader();
    const maxAniso = Math.min(16, renderer.capabilities.getMaxAnisotropy());
    const scene = globe.scene();

    renderer.toneMapping = ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.outputColorSpace = SRGBColorSpace;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    ["cbiux-sun", "cbiux-fill", "cbiux-ambient"].forEach((name) => {
      const prev = scene.getObjectByName(name);
      if (prev) scene.remove(prev);
    });

    const sun = new DirectionalLight(0xfff6ea, 3.4);
    sun.name = "cbiux-sun";
    sun.position.set(-8, 4.2, 6);
    const fill = new DirectionalLight(0x6d7cff, 0.85);
    fill.name = "cbiux-fill";
    fill.position.set(7, -1.8, -4);
    const ambient = new AmbientLight(0x7f8cb8, 0.48);
    ambient.name = "cbiux-ambient";
    scene.add(sun, fill, ambient);

    let cancelled = false;
    let attempts = 0;

    const polishMaterial = () => {
      if (cancelled) return;
      const material = findGlobeMaterial(globe);
      if (!material?.map && attempts < 12) {
        attempts += 1;
        window.setTimeout(polishMaterial, 180);
        return;
      }
      if (!material) return;

      if (material.map) {
        material.map.colorSpace = SRGBColorSpace;
        material.map.anisotropy = maxAniso;
        material.map.needsUpdate = true;
      }

      material.color = new Color("#ffffff");
      material.emissive = new Color("#07101f");
      material.emissiveIntensity = 0.08;
      material.specular = new Color("#c9d6ee");
      material.shininess = 28;
      material.bumpScale = 4;
      material.needsUpdate = true;

      loader.load("/globe/earth-normal.jpg", (tex) => {
        if (cancelled) return;
        tex.colorSpace = NoColorSpace;
        tex.anisotropy = maxAniso;
        material.normalMap = tex;
        material.normalScale.set(0.55, 0.55);
        material.needsUpdate = true;
      });
      loader.load("/globe/earth-specular.jpg", (tex) => {
        if (cancelled) return;
        tex.colorSpace = NoColorSpace;
        tex.anisotropy = maxAniso;
        material.specularMap = tex;
        material.needsUpdate = true;
      });
    };

    polishMaterial();

    return () => {
      cancelled = true;
    };
  }, [ready]);

  useEffect(() => {
    const globe = globeRef.current;
    if (!ready || !globe) return;

    const loader = new TextureLoader();
    let cancelled = false;

    loader.load("/globe/earth-clouds.png", (tex) => {
      if (cancelled || !globeRef.current) return;
      tex.colorSpace = SRGBColorSpace;
      tex.anisotropy = Math.min(8, globe.renderer().capabilities.getMaxAnisotropy());

      const radius = globe.getGlobeRadius() * 1.018;
      const mesh = new Mesh(
        new SphereGeometry(radius, 96, 64),
        new MeshPhongMaterial({
          map: tex,
          transparent: true,
          opacity: 0.32,
          depthWrite: false,
        }),
      );
      mesh.name = "clouds";
      globe.scene().add(mesh);
      cloudsRef.current = mesh;
    });

    return () => {
      cancelled = true;
      const mesh = cloudsRef.current;
      if (mesh) {
        globe.scene().remove(mesh);
        mesh.geometry.dispose();
        const mat = mesh.material;
        if (Array.isArray(mat)) mat.forEach((item) => item.dispose());
        else mat.dispose();
        cloudsRef.current = null;
      }
    };
  }, [ready, size.width, size.height]);

  useEffect(() => {
    if (!ready || reduceMotion || !inView) return;
    let frame = 0;
    const spin = () => {
      const clouds = cloudsRef.current;
      if (clouds) clouds.rotation.y += 0.00028;
      frame = window.requestAnimationFrame(spin);
    };
    frame = window.requestAnimationFrame(spin);
    return () => window.cancelAnimationFrame(frame);
  }, [ready, reduceMotion, inView]);

  return (
    <div ref={wrapRef} className="route-globe-canvas relative h-full min-h-[360px] w-full">
      {size.width > 0 ? (
        <Globe
          ref={globeRef}
          width={size.width}
          height={size.height}
          backgroundColor="rgba(0,0,0,0)"
          backgroundImageUrl="/globe/night-sky.png"
          globeImageUrl="/globe/earth-day-4k.jpg"
          bumpImageUrl="/globe/earth-topology.png"
          globeCurvatureResolution={2}
          showAtmosphere
          atmosphereColor="#9ec4ff"
          atmosphereAltitude={0.25}
          rendererConfig={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
          onGlobeReady={() => setReady(true)}
          arcsData={arcs}
          arcStartLat="startLat"
          arcStartLng="startLng"
          arcEndLat="endLat"
          arcEndLng="endLng"
          arcAltitudeAutoScale={0.44}
          arcCurveResolution={96}
          arcStroke={(arc: object) => ((arc as ArcLayer).kind === "glow" ? 1.85 : 0.55)}
          arcColor={(arc: object) => {
            const data = arc as ArcLayer;
            const hot =
              activeIndex != null && (data.index === activeIndex || data.index === activeIndex - 1);
            if (data.kind === "glow") {
              if (hot) return "rgba(255,255,255,0.28)";
              return data.outbound ? "rgba(109,124,255,0.28)" : "rgba(212,190,120,0.26)";
            }
            if (hot) return ["#ffffff", "#dce4ff"];
            return data.outbound ? ["#4d63f0", "#e8edff"] : ["#e4c56a", "#fff6d0"];
          }}
          arcDashLength={(arc: object) => ((arc as ArcLayer).kind === "core" ? 0.42 : 1)}
          arcDashGap={(arc: object) => ((arc as ArcLayer).kind === "core" ? 0.28 : 0)}
          arcDashAnimateTime={reduceMotion ? 0 : 2200}
          arcsTransitionDuration={reduceMotion ? 0 : 900}
          htmlElementsData={pinLabels}
          htmlLat="lat"
          htmlLng="lng"
          htmlAltitude={0.022}
          htmlElement={makePin}
          htmlElementVisibilityModifier={(el, isVisible) => {
            el.style.opacity = isVisible ? "1" : "0";
            el.style.pointerEvents = isVisible ? "auto" : "none";
          }}
          htmlTransitionDuration={280}
          ringsData={reduceMotion ? [] : rings}
          ringColor={() => (t: number) => `rgba(143,182,255,${0.85 - t})`}
          ringMaxRadius={2.6}
          ringPropagationSpeed={2.1}
          ringRepeatPeriod={1200}
        />
      ) : null}
    </div>
  );
}
