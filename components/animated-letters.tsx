"use client";

import { useEffect, useRef, useState } from "react";

type LetterPart = {
  text: string;
  accent?: boolean;
};

export function AnimatedLetters({
  text,
  parts,
  accent = false,
  className = "",
}: {
  text?: string;
  parts?: LetterPart[];
  accent?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [inView, setInView] = useState(false);
  const items = parts ?? [{ text: text ?? "", accent }];
  const label = items.map((part) => part.text).join(" ");

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (media.matches) {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setInView(true);
      },
      { threshold: 0.22, rootMargin: "0px 0px -6% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  let index = 0;

  return (
    <span
      ref={ref}
      className={`letter-line ${inView ? "is-inview" : ""} ${className}`.trim()}
      aria-label={label}
    >
      <span aria-hidden="true">
      {items.map((part, partIndex) => (
        <span key={`${part.text}-${partIndex}`} className="letter-run">
          {partIndex > 0 ? " " : null}
          {part.text.split(" ").map((word, wordIndex, words) => {
            const start = index;
            const nodes = Array.from(word).map((char, charIndex) => {
              const i = start + charIndex;
              index += 1;
              return (
                <span
                  key={`${word}-${charIndex}`}
                  className={`letter ${part.accent ? "is-accent" : ""}`}
                  style={{ ["--i" as string]: i } as React.CSSProperties}
                >
                  <span className="letter-inner">{char}</span>
                </span>
              );
            });
            if (wordIndex < words.length - 1) index += 1;
            return (
              <span key={`${word}-${wordIndex}`}>
                <span className="letter-word">{nodes}</span>
                {wordIndex < words.length - 1 ? " " : null}
              </span>
            );
          })}
        </span>
      ))}
      </span>
    </span>
  );
}
