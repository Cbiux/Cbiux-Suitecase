"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Globe, { type GlobeMethods } from "react-globe.gl";
import {
  PLACES,
  ROUTE_ARCS,
  ROUTE_POINTS,
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

const OVERVIEW = { lat: 26, lng: -12, altitude: 2.15 };
const CLOSE_ALTITUDE = 1.55;

export default function TripGlobe({
  labels,
  activeIndex,
  reduceMotion,
  onSelectPlace,
}: TripGlobeProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [ready, setReady] = useState(false);
  const [inView, setInView] = useState(true);

  const activePlace = activeIndex == null ? null : ROUTE_VISITS[activeIndex];
  const activeCoords = activePlace ? PLACES[activePlace] : null;

  const rings = useMemo(() => {
    if (!activeCoords) {
      return [
        { lat: PLACES.sjo.lat, lng: PLACES.sjo.lng },
        { lat: PLACES.bom.lat, lng: PLACES.bom.lng },
      ];
    }
    return [{ lat: activeCoords.lat, lng: activeCoords.lng }];
  }, [activeCoords]);

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
    const globe = globeRef.current;
    if (!ready || !globe) return;

    const controls = globe.controls();
    controls.enableZoom = false;
    controls.enablePan = false;
    controls.autoRotate = !reduceMotion && activeIndex == null;
    controls.autoRotateSpeed = 0.42;
    globe.renderer().setPixelRatio(Math.min(window.devicePixelRatio, 2));
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
        reduceMotion ? 0 : 900,
      );
      return;
    }
    globe.pointOfView(OVERVIEW, reduceMotion ? 0 : 900);
  }, [activeCoords, ready, reduceMotion]);

  return (
    <div ref={wrapRef} className="route-globe-canvas relative h-full min-h-[360px] w-full">
      {size.width > 0 ? (
        <Globe
          ref={globeRef}
          width={size.width}
          height={size.height}
          backgroundColor="rgba(0,0,0,0)"
          globeImageUrl="/globe/earth-night.jpg"
          showAtmosphere
          atmosphereColor="#4d63f0"
          atmosphereAltitude={0.18}
          rendererConfig={{ antialias: true, alpha: true }}
          onGlobeReady={() => setReady(true)}
          pointsData={ROUTE_POINTS}
          pointLat="lat"
          pointLng="lng"
          pointAltitude={0.012}
          pointRadius={(point: object) => ((point as { id: PlaceId }).id === activePlace ? 0.72 : 0.46)}
          pointColor={(point: object) => {
            const id = (point as { id: PlaceId }).id;
            if (id === activePlace) return "#ffffff";
            if (id === "sjo" || id === "bom") return "#f4f3ef";
            return "#8ea0ff";
          }}
          pointLabel={(point: object) => {
            const id = (point as { id: PlaceId }).id;
            return labels.find((label) => label.id === id)?.text ?? "";
          }}
          onPointClick={(point: object) => onSelectPlace((point as { id: PlaceId }).id)}
          arcsData={ROUTE_ARCS}
          arcStartLat="startLat"
          arcStartLng="startLng"
          arcEndLat="endLat"
          arcEndLng="endLng"
          arcAltitudeAutoScale={0.4}
          arcStroke={(arc: object) => {
            const index = (arc as RouteArc).index;
            return activeIndex != null && (index === activeIndex || index === activeIndex - 1)
              ? 0.85
              : 0.45;
          }}
          arcColor={(arc: object) => {
            const data = arc as RouteArc;
            const hot =
              activeIndex != null && (data.index === activeIndex || data.index === activeIndex - 1);
            if (hot) return ["#ffffff", "#c7d0ff"];
            return data.outbound ? ["#2c3fd1", "#8ea0ff"] : ["#8ea0ff", "#c5b06a"];
          }}
          arcDashLength={0.55}
          arcDashGap={0.35}
          arcDashAnimateTime={reduceMotion ? 0 : 2400}
          arcsTransitionDuration={reduceMotion ? 0 : 1100}
          labelsData={labels}
          labelLat="lat"
          labelLng="lng"
          labelText="text"
          labelSize={1.15}
          labelAltitude={0.018}
          labelDotRadius={0}
          labelColor={() => "rgba(244,243,239,0.92)"}
          labelResolution={2}
          onLabelClick={(label) => onSelectPlace((label as GlobeLabel).id)}
          ringsData={reduceMotion ? [] : rings}
          ringColor={() => (t: number) => `rgba(109,124,255,${1 - t})`}
          ringMaxRadius={3.2}
          ringPropagationSpeed={2.4}
          ringRepeatPeriod={1400}
        />
      ) : null}
    </div>
  );
}
