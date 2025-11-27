import {
  FC,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { MouseEvent as ReactMouseEvent } from "react";
import { usePreferences } from "@/contexts/preferences-context";

type Star = {
  x: number;
  y: number;
  id: number;
  power: number;
};

type ConnectionLine = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  power: number;
  distance: number;
};

type AnimatedLine = ConnectionLine & {
  id: number;
  progress: number;
  glowing: boolean;
  intensity?: number;
};

type BackgroundStar = {
  x: number;
  y: number;
  size: number;
  opacity: number;
  twinkle: number;
  color: string;
  depth: number;
};

type EnergyRing = {
  id: number;
  x: number;
  y: number;
  size: number;
  opacity: number;
};

type FloatingText = {
  id: number;
  text: string;
  x: number;
  y: number;
  life: number;
};

type Particle = {
  id: number;
  x: number;
  y: number;
  size: number;
  opacity: number;
  speed: number;
  direction: number;
  color: string;
  type: "energy" | "light";
  lifetime: number;
};

const baseLeafTexts = [
  "Vanguardia",
  "Texturas",
  "Brillo",
  "Movimiento",
  "Elegancia",
  "Silueta",
  "Alta costura",
  "Estilo",
];

type GradientStop = {
  offset: string;
  color: string;
  opacity: number;
};

type TreeVariant = {
  id: string;
  label: string;
  title: string;
  subtitle: string;
  description: string;
  trunkStops: GradientStop[];
  leafStops: GradientStop[];
  aura: {
    inner: string;
    mid: string;
    outer: string;
    halo: string;
    overlayStart: string;
    overlayEnd: string;
  };
  accent: string;
  accentSoft: string;
  nameplateGradient: string;
};

const toRgba = (hex: string, alpha: number) => {
  const normalized = hex.replace("#", "");
  const fullHex =
    normalized.length === 3
      ? normalized
          .split("")
          .map((char) => `${char}${char}`)
          .join("")
      : normalized;
  const bigint = Number.parseInt(fullHex, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const treeVariantOptions: TreeVariant[] = [
  {
    id: "luminous-core",
    label: "Luz blanca",
    title: "IITOS TURRE",
    subtitle: "LEGALTECH",
    description: "Firma pura inspirada en el isotipo de luz blanca.",
    trunkStops: [
      { offset: "0%", color: "#ffffff", opacity: 1 },
      { offset: "50%", color: "#f7f8fb", opacity: 0.95 },
      { offset: "100%", color: "#ffffff", opacity: 1 },
    ],
    leafStops: [
      { offset: "0%", color: "#ffffff", opacity: 1 },
      { offset: "70%", color: "#f5f7ff", opacity: 0.92 },
      { offset: "100%", color: "#ffffff", opacity: 0.72 },
    ],
    aura: {
      inner: "#ffffff",
      mid: "#eff4ff",
      outer: "#dfeaff",
      halo: "#cfdfff",
      overlayStart: "#ffffff",
      overlayEnd: "#f5faff",
    },
    accent: "rgba(255, 255, 255, 0.95)",
    accentSoft: "rgba(239, 246, 255, 0.6)",
    nameplateGradient: "linear-gradient(45deg, #ffffff, #f7f8fb, #ffffff)",
  },
  {
    id: "opal-glow",
    label: "Opalescente",
    title: "IITOS TURRE",
    subtitle: "INNOVACIÓN JURÍDICA",
    description: "Destellos nacarados con matices azul hielo.",
    trunkStops: [
      { offset: "0%", color: "#ffffff", opacity: 1 },
      { offset: "50%", color: "#eaf4ff", opacity: 0.9 },
      { offset: "100%", color: "#f5fbff", opacity: 1 },
    ],
    leafStops: [
      { offset: "0%", color: "#ffffff", opacity: 1 },
      { offset: "70%", color: "#e3f4ff", opacity: 0.9 },
      { offset: "100%", color: "#ffffff", opacity: 0.65 },
    ],
    aura: {
      inner: "#f7fbff",
      mid: "#e0f1ff",
      outer: "#c8e3ff",
      halo: "#b2d8ff",
      overlayStart: "#f0f8ff",
      overlayEnd: "#e0f2ff",
    },
    accent: "rgba(198, 226, 255, 0.95)",
    accentSoft: "rgba(198, 226, 255, 0.45)",
    nameplateGradient: "linear-gradient(60deg, #ffffff, #e3f4ff, #f9fdff)",
  },
  {
    id: "polar-flare",
    label: "Polar",
    title: "IITOS TURRE",
    subtitle: "ESTUDIO DIGITAL",
    description: "Silencio ártico con luces boreales muy suaves.",
    trunkStops: [
      { offset: "0%", color: "#ffffff", opacity: 1 },
      { offset: "50%", color: "#f3f9ff", opacity: 0.88 },
      { offset: "100%", color: "#ffffff", opacity: 1 },
    ],
    leafStops: [
      { offset: "0%", color: "#ffffff", opacity: 1 },
      { offset: "70%", color: "#edf7ff", opacity: 0.85 },
      { offset: "100%", color: "#ffffff", opacity: 0.65 },
    ],
    aura: {
      inner: "#ffffff",
      mid: "#e6f6ff",
      outer: "#d0eaff",
      halo: "#bce1ff",
      overlayStart: "#ffffff",
      overlayEnd: "#e4f4ff",
    },
    accent: "rgba(210, 236, 255, 0.9)",
    accentSoft: "rgba(210, 236, 255, 0.45)",
    nameplateGradient: "linear-gradient(55deg, #ffffff, #f0faff, #ffffff)",
  },
];

const ImmersiveExperience: FC = () => {
  const { preferences } = usePreferences();

  const [stars, setStars] = useState<Star[]>([]);
  const [isRevealing, setIsRevealing] = useState(false);
  const [constellationName, setConstellationName] = useState("");
  const [constellationStory, setConstellationStory] = useState("");
  const [animatedLines, setAnimatedLines] = useState<AnimatedLine[]>([]);
  const [backgroundStars, setBackgroundStars] = useState<BackgroundStar[]>([]);
  const [currentView, setCurrentView] = useState<"constellation" | "transitioning" | "tree">(
    "constellation",
  );
  const [slideProgress, setSlideProgress] = useState(0);
  const [treeHovered, setTreeHovered] = useState(false);
  const [clickedLeaf, setClickedLeaf] = useState<string | null>(null);
  const [pulseIntensity, setPulseIntensity] = useState(0.5);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [lightIntensity, setLightIntensity] = useState(1);
  const [isExploding, setIsExploding] = useState(false);
  const [energyRings, setEnergyRings] = useState<EnergyRing[]>([]);
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);
  const [cameraShake, setCameraShake] = useState(0);
  const [timeOfDay, setTimeOfDay] = useState<"night" | "dawn" | "dusk">("night");
  const [powerLevel, setPowerLevel] = useState(0);
  const [activeVariantId, setActiveVariantId] = useState(
    treeVariantOptions[0]?.id ?? "luminous-core",
  );

  const canvasRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      setMousePosition({
        x: (event.clientX / window.innerWidth) * 100,
        y: (event.clientY / window.innerHeight) * 100,
      });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  useEffect(() => {
    if (currentView !== "tree") {
      return;
    }

    const newParticles: Particle[] = Array.from({ length: 60 }, (_, index) => ({
      id: index,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 3 + 1,
      opacity: Math.random() * 0.6 + 0.3,
      speed: Math.random() * 0.8 + 0.2,
      direction: Math.random() * 360,
      color: ["#ffffff", "#f2fbff", "#e5f5ff", "#d0ecff"][Math.floor(Math.random() * 4)],
      type: Math.random() > 0.7 ? "energy" : "light",
      lifetime: Math.random() * 120 + 60,
    }));

    setParticles(newParticles);

    const interval = window.setInterval(() => {
      setParticles((prevParticles) =>
        prevParticles
          .map((particle) => {
            const radians = (particle.direction * Math.PI) / 180;
            const newX = (particle.x + Math.cos(radians) * particle.speed) % 100;
            const newY = (particle.y + Math.sin(radians) * particle.speed) % 100;

            return {
              ...particle,
              x: newX < 0 ? 100 + newX : newX,
              y: newY < 0 ? 100 + newY : newY,
              opacity: Math.max(0.15, particle.opacity + (Math.random() - 0.5) * 0.1),
              lifetime: particle.lifetime - 1,
              size: particle.size + Math.sin(Date.now() * 0.01) * 0.3,
            };
          })
          .filter((particle) => particle.lifetime > 0),
      );
    }, 60);

    return () => window.clearInterval(interval);
  }, [currentView]);

  useEffect(() => {
    const starsInBackground: BackgroundStar[] = Array.from({ length: 200 }, () => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2 + 0.5,
      opacity: Math.random() * 0.9 + 0.1,
      twinkle: Math.random() * 4 + 1,
      color: Math.random() > 0.8 ? "#cfe9ff" : "#ffffff",
      depth: Math.random(),
    }));

    setBackgroundStars(starsInBackground);
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      const time = Date.now() * 0.001;
      setPulseIntensity(0.45 + Math.sin(time * 2) * 0.25 + Math.cos(time * 3) * 0.15);
      setLightIntensity(0.85 + Math.sin(time * 1.5) * 0.35);
    }, 16);

    return () => window.clearInterval(interval);
  }, []);

  const activeVariant = useMemo(
    () =>
      treeVariantOptions.find((variant) => variant.id === activeVariantId) ??
      treeVariantOptions[0],
    [activeVariantId],
  );

  const playVisualSound = useCallback((type: "star" | "explosion" | "leaf") => {
    setCameraShake(6);
    window.setTimeout(() => setCameraShake(0), 200);

    if (type === "explosion") {
      setIsExploding(true);
      window.setTimeout(() => setIsExploding(false), 1000);
    }
  }, []);

  const paletteSnapshot = useMemo(() => {
    const colors = preferences.colors ?? [];
    if (!colors.length) {
      return "Luz neutra";
    }

    if (colors.length === 1) {
      return colors[0];
    }

    if (colors.length === 2) {
      return `${colors[0]} & ${colors[1]}`;
    }

    const [primary, secondary, ...rest] = colors;
    const trailing = rest.length ? ` + ${rest.length} más` : "";
    return `${primary}, ${secondary}${trailing}`;
  }, [preferences.colors]);

  const sortedOccasions = useMemo(
    () => [...preferences.occasions].sort((a, b) => b.priority - a.priority),
    [preferences.occasions],
  );

  const seasonsSnapshot = useMemo(() => {
    const seasons = preferences.seasons ?? [];
    if (!seasons.length) {
      return "Todo el año";
    }
    if (seasons.length === 1) {
      return seasons[0];
    }
    return `${seasons[0]} • ${seasons[1] ?? seasons[0]}`;
  }, [preferences.seasons]);

  const styleSnapshot = useMemo(() => {
    if (!preferences.styles.length) {
      return "Estilo libre";
    }
    if (preferences.styles.length === 1) {
      return preferences.styles[0];
    }
    return `${preferences.styles[0]} x ${preferences.styles[1] ?? preferences.styles[0]}`;
  }, [preferences.styles]);

  const getLeafTexts = useCallback(() => {
    const paletteWords = preferences.colors ?? [];
    const seasonWords = preferences.seasons ?? [];
    const occasionWords = sortedOccasions.map((occasion) => occasion.name);
    const raw = [
      ...baseLeafTexts,
      ...preferences.styles,
      ...paletteWords,
      ...seasonWords,
      ...occasionWords,
    ];

    const sanitized = raw
      .map((word) => word.trim())
      .filter((word) => word.length > 0);

    return Array.from(new Set(sanitized));
  }, [
    preferences.colors,
    preferences.seasons,
    preferences.styles,
    sortedOccasions,
  ]);

  const calculateConstellationLines = useCallback(
    (constellationStars: Star[]): ConnectionLine[] => {
      if (constellationStars.length < 2) {
        return [];
      }

      const connections: ConnectionLine[] = [];

      for (let i = 0; i < constellationStars.length; i += 1) {
        for (let j = i + 1; j < constellationStars.length; j += 1) {
          const distance = Math.sqrt(
            (constellationStars[i].x - constellationStars[j].x) ** 2 +
              (constellationStars[i].y - constellationStars[j].y) ** 2,
          );

          const powerFactor =
            (constellationStars[i].power + constellationStars[j].power) / 200;
          const connectionThreshold = 150 + powerFactor * 100;

          if (distance < connectionThreshold) {
            connections.push({
              x1: constellationStars[i].x,
              y1: constellationStars[i].y,
              x2: constellationStars[j].x,
              y2: constellationStars[j].y,
              power: powerFactor,
              distance,
            });
          }
        }
      }

      return connections;
    },
    [],
  );

  const handleCanvasClick = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      if (isRevealing || currentView !== "constellation" || !canvasRef.current) {
        return;
      }

      const rect = canvasRef.current.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      const ringId = Date.now();
      const newRing: EnergyRing = {
        id: ringId,
        x: (x / rect.width) * 100,
        y: (y / rect.height) * 100,
        size: 0,
        opacity: 1,
      };

      setEnergyRings((previous) => [...previous, newRing]);

      let ringSize = 0;
      const ringInterval = window.setInterval(() => {
        ringSize += 2;
        setEnergyRings((previous) =>
          previous.map((ring) =>
            ring.id === newRing.id
              ? {
                  ...ring,
                  size: ringSize,
                  opacity: Math.max(0, 1 - ringSize / 100),
                }
              : ring,
          ),
        );

        if (ringSize > 100) {
          window.clearInterval(ringInterval);
          setEnergyRings((previous) => previous.filter((ring) => ring.id !== ringId));
        }
      }, 50);

      const starId = Date.now();
      const newStar: Star = {
        x,
        y,
        id: starId,
        power: Math.random() * 100,
      };

      setStars((previous) => [...previous, newStar]);
      playVisualSound("star");
    },
    [currentView, isRevealing, playVisualSound],
  );

  const startEpicTransition = useCallback(() => {
    setCurrentView("transitioning");
    playVisualSound("explosion");

    const phases = [
      { duration: 500, effect: "fadeOut" },
      { duration: 1000, effect: "slide" },
      { duration: 500, effect: "emerge" },
    ] as const;

    let currentPhase = 0;
    const startTime = Date.now();

    const animateTransition = () => {
      const elapsed = Date.now() - startTime;
      let totalElapsed = 0;
      let phaseProgress = 0;

      for (let index = 0; index <= currentPhase; index += 1) {
        if (index === currentPhase) {
          phaseProgress = Math.min((elapsed - totalElapsed) / phases[index].duration, 1);
        }
        totalElapsed += phases[index].duration;
      }

      if (phases[currentPhase].effect === "slide") {
        const easeInOutCubic =
          phaseProgress < 0.5
            ? 4 * phaseProgress ** 3
            : 1 - ((-2 * phaseProgress + 2) ** 3) / 2;
        setSlideProgress(easeInOutCubic);
      }

      if (phaseProgress >= 1) {
        currentPhase += 1;
        if (currentPhase >= phases.length) {
          setCurrentView("tree");
          return;
        }
      }

      window.requestAnimationFrame(animateTransition);
    };

    window.requestAnimationFrame(animateTransition);
  }, [playVisualSound]);

  const revealConstellation = useCallback(() => {
    if (stars.length < 3) {
      setCameraShake(12);
      window.setTimeout(() => setCameraShake(0), 300);

      const errorText: FloatingText = {
        id: Date.now(),
        text: "¡Necesitas al menos 3 estrellas!",
        x: 50,
        y: 50,
        life: 100,
      };

      setFloatingTexts([errorText]);
      window.setTimeout(() => setFloatingTexts([]), 2000);
      return;
    }

    setIsRevealing(true);
    playVisualSound("explosion");

    const connectionLines = calculateConstellationLines(stars);
    setAnimatedLines([]);

    const totalPower = stars.reduce((sum, star) => sum + star.power, 0);
    setPowerLevel(Math.min(100, totalPower / 10));

    let delay = 0;
    connectionLines.forEach((line, index) => {
      window.setTimeout(() => {
        setAnimatedLines((previous) => [
          ...previous,
          {
            ...line,
            id: index,
            progress: 0,
            glowing: true,
          },
        ]);

        const startTime = Date.now();
        const duration = 300 + line.power * 200;

        const animate = () => {
          const elapsed = Date.now() - startTime;
          const progress = Math.min(elapsed / duration, 1);

          setAnimatedLines((previous) =>
            previous.map((animatedLine) =>
              animatedLine.id === index
                ? {
                    ...animatedLine,
                    progress,
                    glowing: progress > 0.5,
                    intensity: Math.sin(progress * Math.PI),
                  }
                : animatedLine,
            ),
          );

          if (progress < 1) {
            window.requestAnimationFrame(animate);
          }
        };

        window.requestAnimationFrame(animate);
      }, delay);

      delay += 150;
    });

    window.setTimeout(() => {
      let name = "";
      let story = "";

      const leadOccasion = sortedOccasions[0]?.name ?? "momentos especiales";
      const supportingOccasion = sortedOccasions[1]?.name;
      const primaryStyles = preferences.styles;
      const combinedStyles =
        primaryStyles.length > 1
          ? `${primaryStyles[0]} y ${primaryStyles[1]}`
          : primaryStyles[0] ?? "tu sello personal";
      const tonePalette = preferences.colors ?? [];
      const colorDescriptor = (() => {
        if (tonePalette.length === 0) {
          return "destellos nacarados";
        }
        if (tonePalette.length === 1) {
          return `matices ${tonePalette[0].toLowerCase()}`;
        }
        return `matices ${tonePalette[0].toLowerCase()} y ${
          tonePalette[1].toLowerCase()
        }`;
      })();
      const occasionDescriptor = supportingOccasion
        ? `${leadOccasion.toLowerCase()} y ${supportingOccasion.toLowerCase()}`
        : leadOccasion.toLowerCase();

      if (totalPower > 600) {
        name = "Constelación Haute Couture";
        story = `Un tapiz radiante de estrellas celebra ${combinedStyles} con ${colorDescriptor}. La IA de Fashionist transforma tus ideas en piezas únicas para ${occasionDescriptor}.`;
        setTimeOfDay("dawn");
      } else if (totalPower > 400) {
        name = "Constelación Prêt-à-Lumière";
        story = `Las líneas de luz dibujan un árbol guía que mezcla ${combinedStyles} con temporadas ${seasonsSnapshot.toLowerCase()}. Sigue el resplandor para descubrir combinaciones listas para ${leadOccasion.toLowerCase()}.`;
        setTimeOfDay("dusk");
      } else {
        name = "Constelación del Estilo Diario";
        story = `Una armonía serena equilibra ${styleSnapshot.toLowerCase()} y tu paleta ${paletteSnapshot.toLowerCase()}. Cada estrella inspira atuendos versátiles para ${occasionDescriptor}.`;
        setTimeOfDay("night");
      }

      setConstellationName(name);
      setConstellationStory(story);

      window.setTimeout(() => {
        startEpicTransition();
      }, 4000);

      setIsRevealing(false);
    }, delay + 800);
  }, [
    calculateConstellationLines,
    paletteSnapshot,
    playVisualSound,
    preferences,
    seasonsSnapshot,
    sortedOccasions,
    startEpicTransition,
    stars,
    styleSnapshot,
  ]);

  const resetToConstellation = useCallback(() => {
    setCurrentView("constellation");
    setSlideProgress(0);
    setStars([]);
    setAnimatedLines([]);
    setConstellationName("");
    setConstellationStory("");
    setEnergyRings([]);
    setFloatingTexts([]);
    setPowerLevel(0);
    setTimeOfDay("night");
  }, []);

  const handleLeafClick = useCallback(
    (leafId: string) => {
      setClickedLeaf(leafId);
      playVisualSound("leaf");

      const options = getLeafTexts();
      const randomText = options[Math.floor(Math.random() * options.length)];
      const floatingText: FloatingText = {
        id: Date.now(),
        text: randomText,
        x: 50 + (Math.random() - 0.5) * 20,
        y: 40 + (Math.random() - 0.5) * 10,
        life: 100,
      };

      setFloatingTexts((previous) => [...previous, floatingText]);

      window.setTimeout(() => {
        setClickedLeaf(null);
        setFloatingTexts((previous) => previous.filter((text) => text.id !== floatingText.id));
      }, 2000);
    },
    [getLeafTexts, playVisualSound],
  );

  const EnhancedTree3D = useMemo(() => {
    const leaves = [
      { d: "M60 120 Q45 105 55 90 Q70 100 60 120", id: "leaf1", x: 60, y: 105 },
      { d: "M50 110 Q35 95 45 80 Q60 90 50 110", id: "leaf2", x: 50, y: 95 },
      { d: "M70 100 Q55 85 65 70 Q80 80 70 100", id: "leaf3", x: 70, y: 85 },
      { d: "M140 120 Q155 105 145 90 Q130 100 140 120", id: "leaf4", x: 140, y: 105 },
      { d: "M150 110 Q165 95 155 80 Q140 90 150 110", id: "leaf5", x: 150, y: 95 },
      { d: "M130 100 Q145 85 135 70 Q120 80 130 100", id: "leaf6", x: 130, y: 85 },
      { d: "M100 110 Q85 95 95 80 Q110 90 100 110", id: "leaf7", x: 100, y: 95 },
      { d: "M100 90 Q85 75 95 60 Q110 70 100 90", id: "leaf8", x: 100, y: 75 },
    ];

    const variant = activeVariant;
    const trunkGradientId = `trunkGradient-${variant.id}`;
    const leafGradientId = `leafGradient-${variant.id}`;

    return (
      <div
        className="relative w-96 h-[28rem]"
        style={{
          transform: `scale(${1 + powerLevel * 0.003}) ${
            cameraShake > 0
              ? `translate(${Math.random() * cameraShake - cameraShake / 2}px, ${
                  Math.random() * cameraShake - cameraShake / 2
                }px)`
              : ""
          }`,
        }}
      >
        <svg
          viewBox="0 0 200 240"
          className="w-full h-full"
          style={{
            filter: `
              drop-shadow(0 0 ${20 + pulseIntensity * 20}px ${variant.accent})
              drop-shadow(0 0 ${40 + lightIntensity * 30}px ${variant.accentSoft})
              drop-shadow(0 0 ${60 + powerLevel}px rgba(255, 255, 255, ${powerLevel * 0.01}))
            `,
            transition: "filter 0.1s ease",
            transform: `
              perspective(1000px)
              rotateX(${treeHovered ? 15 : 5}deg)
              rotateY(${(mousePosition.x - 50) * 0.1}deg)
              rotateZ(${(mousePosition.x - 50) * 0.05}deg)
              scale(${treeHovered ? 1.15 : 1})
            `,
            transformStyle: "preserve-3d",
          }}
          onMouseEnter={() => setTreeHovered(true)}
          onMouseLeave={() => setTreeHovered(false)}
        >
          <defs>
            <linearGradient id={trunkGradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              {variant.trunkStops.map((stop) => (
                <stop
                  key={`${stop.offset}-${stop.color}`}
                  offset={stop.offset}
                  stopColor={stop.color}
                  stopOpacity={stop.opacity}
                />
              ))}
            </linearGradient>

            <radialGradient id={leafGradientId} cx="50%" cy="50%" r="50%">
              {variant.leafStops.map((stop) => (
                <stop
                  key={`${stop.offset}-${stop.color}`}
                  offset={stop.offset}
                  stopColor={stop.color}
                  stopOpacity={stop.opacity}
                />
              ))}
            </radialGradient>
          </defs>

          <path
            d="M100 200 L100 140 Q100 130 100 120"
            stroke={`url(#${trunkGradientId})`}
            strokeWidth={6 + pulseIntensity * 2}
            fill="none"
            style={{
              filter: `drop-shadow(0 0 ${15 + lightIntensity * 10}px ${variant.accent})`,
            }}
          />

          <g className="branches">
            {["M100 140 Q80 130 60 120", "M100 140 Q120 130 140 120", "M100 130 Q75 120 50 110", "M100 130 Q125 120 150 110", "M100 120 Q85 110 70 100", "M100 120 Q115 110 130 100"].map((path, index) => (
              <path
                key={path}
                d={path}
                stroke={`url(#${trunkGradientId})`}
                strokeWidth={4 - index * 0.3 + pulseIntensity}
                fill="none"
                style={{
                  opacity: 0.8 + lightIntensity * 0.2,
                  filter: `drop-shadow(0 0 ${8 + index * 2}px ${variant.accentSoft})`,
                }}
              />
            ))}
          </g>

          <g className="leaves">
            {leaves.map((leaf, index) => (
              <g key={leaf.id}>
                <path
                  d={leaf.d}
                  fill={`url(#${leafGradientId})`}
                  className="cursor-pointer transition-all duration-300"
                  onClick={() => handleLeafClick(leaf.id)}
                  style={{
                    filter: `
                      drop-shadow(0 0 ${12 + pulseIntensity * 8}px ${variant.accent})
                      drop-shadow(0 0 20px ${variant.accentSoft})
                    `,
                    transform: `
                      scale(${clickedLeaf === leaf.id ? 1.4 : 1 + pulseIntensity * 0.1})
                      rotate(${clickedLeaf === leaf.id ? 15 : 0}deg)
                      translateZ(${treeHovered ? 15 + index * 2 : 0}px)
                    `,
                    transformOrigin: "center",
                    opacity: 0.9 + lightIntensity * 0.1,
                  }}
                />

                {clickedLeaf === leaf.id && (
                  <circle
                    cx={leaf.x}
                    cy={leaf.y}
                    r="20"
                    fill="none"
                    stroke={variant.accent}
                    strokeWidth="2"
                    className="animate-ping"
                  />
                )}
              </g>
            ))}
          </g>

          <circle
            cx="100"
            cy="120"
            r={3 + pulseIntensity * 3}
            fill="#ffffff"
            style={{
              filter: `drop-shadow(0 0 ${20 + lightIntensity * 15}px ${variant.accent})`,
              opacity: 0.75 + pulseIntensity * 0.25,
            }}
          />
        </svg>

        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(circle,
              ${toRgba(variant.aura.inner, (treeHovered ? 0.24 : 0.16) + pulseIntensity * 0.1)} 0%,
              ${toRgba(variant.aura.mid, (treeHovered ? 0.18 : 0.1) + lightIntensity * 0.05)} 30%,
              ${toRgba(variant.aura.outer, 0.14 + lightIntensity * 0.08)} 55%,
              ${toRgba(variant.aura.halo, 0.1 + pulseIntensity * 0.06)} 75%,
              transparent 95%)`,
            filter: "blur(40px)",
            transform: `scale(${2 + powerLevel * 0.01})`,
            opacity: pulseIntensity,
          }}
        />

        {isExploding && (
          <div className="absolute inset-0 pointer-events-none">
            {Array.from({ length: 5 }).map((_, index) => (
              <div
                key={`ring-${index}`}
                className="absolute rounded-full border-2 border-white animate-ping"
                style={{
                  left: "50%",
                  top: "50%",
                  width: `${100 + index * 50}px`,
                  height: `${100 + index * 50}px`,
                  transform: "translate(-50%, -50%)",
                  animationDelay: `${index * 0.2}s`,
                  opacity: 0.7 - index * 0.1,
                }}
              />
            ))}
          </div>
        )}
      </div>
    );
  }, [
    activeVariant,
    cameraShake,
    clickedLeaf,
    handleLeafClick,
    isExploding,
    lightIntensity,
    mousePosition.x,
    powerLevel,
    pulseIntensity,
    treeHovered,
  ]);

  return (
    <div
      className="min-h-screen relative overflow-hidden"
      style={{
        transform:
          currentView === "transitioning" ? `translateY(-${slideProgress * 100}vh)` : "translateY(0)",
        transition: currentView !== "transitioning" ? "transform 0.5s ease" : "none",
      }}
    >
      <div
        className="absolute inset-0 transition-all duration-[2000ms]"
        style={{
          background:
            currentView === "tree"
              ? `radial-gradient(circle at ${mousePosition.x}% ${mousePosition.y}%,
                  ${toRgba(activeVariant.aura.inner, 0.4 + lightIntensity * 0.25)} 0%,
                  ${toRgba(activeVariant.aura.mid, 0.32 + pulseIntensity * 0.2)} 35%,
                  ${toRgba(activeVariant.aura.outer, 0.28 + lightIntensity * 0.18)} 60%,
                  ${toRgba(activeVariant.aura.halo, 0.22 + pulseIntensity * 0.12)} 80%,
                  rgba(10, 20, 40, 0.82) 100%),
                linear-gradient(45deg, ${toRgba(activeVariant.aura.overlayStart, 0.16)} 0%, ${toRgba(activeVariant.aura.overlayEnd, 0.16)} 100%)`
              : `linear-gradient(${135 + mousePosition.x * 0.5}deg,
                  rgba(15, 23, 42, ${timeOfDay === "dawn" ? 0.7 : 0.9}) 0%,
                  rgba(30, 41, 59, ${timeOfDay === "dusk" ? 0.8 : 0.95}) 25%,
                  rgba(51, 65, 85, ${timeOfDay === "night" ? 0.98 : 0.85}) 50%,
                  rgba(15, 23, 42, 1) 100%)`,
        }}
      />

      {currentView === "tree" &&
        particles.map((particle) => (
          <div
            key={particle.id}
            className="absolute rounded-full pointer-events-none"
            style={{
              left: `${particle.x}%`,
              top: `${particle.y}%`,
              width: `${particle.size}px`,
              height: `${particle.size}px`,
              backgroundColor: particle.color,
              opacity: particle.opacity,
              filter: particle.type === "energy" ? "blur(1px)" : "blur(0.5px)",
              boxShadow: `0 0 ${particle.size * 2}px ${particle.color}`,
              animation: `float ${3 + Math.random() * 2}s ease-in-out infinite`,
              zIndex: 1,
            }}
          />
        ))}

      {currentView !== "tree" &&
        backgroundStars.map((star, index) => (
          <div
            key={`bg-star-${index}`}
            className="absolute rounded-full"
            style={{
              left: `${star.x + mousePosition.x * star.depth * 0.1}%`,
              top: `${star.y + mousePosition.y * star.depth * 0.1}%`,
              width: star.size,
              height: star.size,
              backgroundColor: star.color,
              opacity: star.opacity,
              animation: `twinkle ${star.twinkle}s infinite alternate`,
              filter: `blur(${star.depth}px)`,
              zIndex: Math.floor(star.depth * 10),
            }}
          />
        ))}

      {energyRings.map((ring) => (
        <div
          key={ring.id}
          className="absolute rounded-full border-2 border-white pointer-events-none"
          style={{
            left: `${ring.x}%`,
            top: `${ring.y}%`,
            width: `${ring.size}px`,
            height: `${ring.size}px`,
            transform: "translate(-50%, -50%)",
            opacity: ring.opacity,
            zIndex: 10,
          }}
        />
      ))}

      {floatingTexts.map((text) => (
        <div
          key={text.id}
          className="absolute text-white font-bold text-lg pointer-events-none"
          style={{
            left: `${text.x}%`,
            top: `${text.y}%`,
            transform: "translate(-50%, -50%)",
            opacity: text.life / 100,
            animation: "float 2s ease-out forwards",
            zIndex: 20,
            textShadow: "0 0 10px rgba(255, 255, 255, 0.8)",
          }}
        >
          {text.text}
        </div>
      ))}

      {currentView !== "tree" && (
        <div className="relative z-10 min-h-screen">
          <div ref={canvasRef} className="absolute inset-0 cursor-crosshair" onClick={handleCanvasClick}>
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              {animatedLines.map((line) => (
                <g key={line.id}>
                  <line
                    x1={line.x1}
                    y1={line.y1}
                    x2={line.x1 + (line.x2 - line.x1) * line.progress}
                    y2={line.y1 + (line.y2 - line.y1) * line.progress}
                    stroke={`rgba(220, 235, 255, ${0.3 + line.power})`}
                    strokeWidth={1.5 + line.power * 2}
                    strokeLinecap="round"
                    style={{
                      filter: line.glowing
                        ? `drop-shadow(0 0 ${10 + line.power * 10}px rgba(255, 255, 255, ${line.intensity ?? 0}))`
                        : "none",
                    }}
                  />
                  {line.progress > 0.8 && (
                    <circle
                      cx={line.x1 + (line.x2 - line.x1) * line.progress}
                      cy={line.y1 + (line.y2 - line.y1) * line.progress}
                      r="2"
                      fill="white"
                      style={{
                        filter: "drop-shadow(0 0 5px rgba(255, 255, 255, 0.8))",
                      }}
                    />
                  )}
                </g>
              ))}
            </svg>

            {stars.map((star) => (
              <div
                key={star.id}
                className="absolute transform -translate-x-1/2 -translate-y-1/2"
                style={{ left: star.x, top: star.y }}
              >
                <div className="relative">
                  <div
                    className="rounded-full shadow-lg"
                    style={{
                      width: `${12 + star.power * 0.05}px`,
                      height: `${12 + star.power * 0.05}px`,
                      backgroundColor: "white",
                      filter: `drop-shadow(0 0 ${8 + star.power * 0.1}px rgba(255, 255, 255, 0.8))`,
                    }}
                  />
                  <div className="absolute inset-0 rounded-full animate-pulse blur-sm bg-white" />
                  <div
                    className="absolute -inset-2 rounded-full blur-md"
                    style={{
                      backgroundColor: `rgba(255, 255, 255, ${0.1 + star.power * 0.003})`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="absolute top-6 left-6 right-6 flex justify-between items-center z-20">
            <div>
              <h1 className="text-2xl font-light text-white/90 mb-2">Constelaciones de Estilo</h1>
              {powerLevel > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-white/70">Energía creativa:</span>
                  <div className="w-32 h-2 bg-white/20 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-200/80 to-blue-300/80 transition-all duration-500"
                      style={{ width: `${powerLevel}%` }}
                    />
                  </div>
                  <span className="text-sm text-white/70">{Math.round(powerLevel)}%</span>
                </div>
              )}
            </div>

            <div className="flex gap-4">
              <button
                type="button"
                onClick={revealConstellation}
                disabled={isRevealing || stars.length < 3}
                className={`bg-gradient-to-r from-blue-500/20 to-cyan-500/20 backdrop-blur-md text-white px-6 py-3 rounded-lg
                  ${isRevealing || stars.length < 3 ? "opacity-50 cursor-not-allowed" : "hover:from-blue-500/30 hover:to-cyan-500/30"}
                  transition-all duration-300 border border-white/20 shadow-lg`}
              >
                {isRevealing ? "✨ Revelando..." : "🌟 Revelar constelación"}
              </button>

              <button
                type="button"
                onClick={resetToConstellation}
                className="bg-white/10 backdrop-blur-md text-white px-6 py-3 rounded-lg hover:bg-white/20 transition-all duration-300 border border-white/20 shadow-lg"
              >
                🔄 Reiniciar
              </button>
            </div>
          </div>

          {constellationName && (
            <div className="absolute bottom-6 left-6 right-6 z-20">
              <div className="bg-gradient-to-r from-blue-900/30 to-slate-900/30 backdrop-blur-md rounded-lg p-8 shadow-2xl border border-white/30">
                <h2 className="text-2xl font-semibold text-blue-200 mb-4 flex items-center gap-2">
                  ✨ {constellationName}
                </h2>
                <p className="text-blue-100 leading-relaxed text-lg">{constellationStory}</p>
                <div className="mt-4 text-center">
                  <div className="inline-block px-4 py-2 bg-white/10 rounded-full text-sm text-white/70">
                    Preparando transición al Árbol de Luz Blanca IITOS TURRE...
                  </div>
                </div>
              </div>
            </div>
          )}

          {stars.length === 0 && (
            <div className="absolute bottom-6 left-6 right-6 text-center z-20">
              <div className="bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-white/10">
                <p className="text-white/90 text-lg mb-2">🌟 Haz clic en cualquier lugar para crear tu constelación</p>
                <p className="text-white/60 text-sm">
                  Cada estrella tendrá un poder único • Conecta al menos 3 para revelar la historia
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {currentView === "tree" && (
        <div className="relative z-10 flex flex-col items-center justify-center min-h-screen p-8">
          <div className="absolute top-6 left-6 max-w-xl">
            <p className="text-white/60 text-xs uppercase tracking-[0.45em] mb-3">Variaciones</p>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              {treeVariantOptions.map((variant) => {
                const isActive = variant.id === activeVariant.id;
                return (
                  <button
                    key={variant.id}
                    type="button"
                    onClick={() => setActiveVariantId(variant.id)}
                    className={`rounded-2xl px-4 py-3 text-left transition-all duration-300 border backdrop-blur-sm ${
                      isActive
                        ? "border-white/60 bg-white/20 text-white shadow-xl"
                        : "border-white/15 bg-white/5 text-white/80 hover:bg-white/10"
                    }`}
                    style={{
                      boxShadow: isActive ? `0 0 20px ${variant.accentSoft}` : "none",
                    }}
                  >
                    <span className="block text-sm font-semibold tracking-wide">{variant.label}</span>
                    <span className="block text-xs mt-1 leading-relaxed">{variant.description}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {EnhancedTree3D}

          <div className="text-center mt-12">
            <div
              className="relative inline-block"
              style={{ filter: `drop-shadow(0 0 ${25 + pulseIntensity * 15}px ${activeVariant.accent})` }}
            >
              <h1
                className="text-6xl md:text-8xl font-bold tracking-wider mb-6"
                style={{
                  background: activeVariant.nameplateGradient,
                  backgroundClip: "text",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundSize: "220% 220%",
                  animation: "gradient-shift 4s ease-in-out infinite",
                }}
              >
                {activeVariant.title}
              </h1>
              <div
                className="h-2 bg-gradient-to-r from-transparent via-white to-transparent mx-auto transition-all duration-500"
                style={{
                  width: treeHovered ? "100%" : "80%",
                  boxShadow: `0 0 ${30 + lightIntensity * 20}px ${activeVariant.accent}`,
                  opacity: 0.8 + lightIntensity * 0.2,
                }}
              />
            </div>
            <p
              className="text-3xl md:text-4xl text-white/90 mt-8 font-light tracking-wide"
              style={{
                filter: `drop-shadow(0 0 15px ${activeVariant.accent})`,
                textShadow: `0 0 20px ${activeVariant.accentSoft}`,
              }}
            >
              {activeVariant.subtitle}
            </p>

            <div className="mt-4 max-w-3xl mx-auto">
              <p className="text-white/70 text-base leading-relaxed">{activeVariant.description}</p>
            </div>

            <div className="mt-6 flex justify-center">
              <div className="bg-white/10 backdrop-blur-sm px-6 py-3 rounded-full border border-white/20">
                <span className="text-white/80 text-sm">Energía del Árbol: </span>
                <span className="text-white font-bold">{Math.round(powerLevel)}%</span>
              </div>
            </div>
          </div>

          <div className="mt-12 w-full max-w-5xl">
            <div className="grid gap-5 md:grid-cols-3">
              <div className="bg-white/10 backdrop-blur-sm border border-white/15 rounded-2xl p-6 text-left">
                <h3 className="text-white/80 text-sm tracking-widest uppercase mb-3">Ocasiones destacadas</h3>
                <ul className="space-y-2 text-white/90">
                  {sortedOccasions.slice(0, 3).map((occasion) => (
                    <li key={occasion.name} className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-white/70" />
                      <span className="text-base">{occasion.name}</span>
                    </li>
                  ))}
                  {sortedOccasions.length === 0 && (
                    <li className="text-white/60 text-sm">Define tus próximas experiencias para personalizar la magia.</li>
                  )}
                </ul>
              </div>
              <div className="bg-white/10 backdrop-blur-sm border border-white/15 rounded-2xl p-6 text-left">
                <h3 className="text-white/80 text-sm tracking-widest uppercase mb-3">Paleta favorita</h3>
                <p className="text-white text-lg font-light">{paletteSnapshot}</p>
                {(preferences.colors?.length ?? 0) > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {preferences.colors?.slice(0, 4).map((color) => (
                      <span
                        key={color}
                        className="px-3 py-1 rounded-full border border-white/20 text-white/80 text-xs backdrop-blur-sm"
                      >
                        {color}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="bg-white/10 backdrop-blur-sm border border-white/15 rounded-2xl p-6 text-left">
                <h3 className="text-white/80 text-sm tracking-widest uppercase mb-3">Dirección de estilo</h3>
                <p className="text-white text-lg font-light">{styleSnapshot}</p>
                <p className="text-white/70 text-sm mt-3">Temporadas favoritas: {seasonsSnapshot}</p>
                {preferences.styles.length > 2 && (
                  <p className="text-white/60 text-xs mt-2">
                    Extras: {preferences.styles.slice(2).join(", ")}
                  </p>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={resetToConstellation}
            className="absolute top-6 right-6 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 backdrop-blur-md text-white px-6 py-3 rounded-lg hover:from-blue-500/30 hover:to-cyan-500/30 transition-all duration-300 border border-white/20 shadow-lg"
          >
            🌟 Volver a las constelaciones
          </button>

          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 text-center">
            <div className="bg-white/5 backdrop-blur-sm rounded-lg p-6 border border-white/10">
              <p className="text-white/90 text-lg mb-3">
                🌳 Interactúa con el Árbol de luz blanca {activeVariant.label.toLowerCase()}
              </p>
              <div className="flex justify-center space-x-6 text-white/70 text-sm">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                  Efectos 3D dinámicos
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-cyan-200 rounded-full animate-pulse" />
                  Hojas reactivas
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-blue-200 rounded-full animate-pulse" />
                  Energía creativa
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImmersiveExperience;
