"use client";
import { useEffect } from "react";
import { motion, stagger, useAnimate } from "motion/react";
import { cn } from "@/lib/utils";

export const TextGenerateEffect = ({
  words,
  className,
  filter = true,
  duration = 0.5,
  highlightedWords,
  highlightColor,
}: {
  words: string;
  className?: string;
  filter?: boolean;
  duration?: number;
  highlightedWords?: string[];
  highlightColor?: string;
}) => {
  const [scope, animate] = useAnimate();
  const wordsArray = words.split(" ");

  useEffect(() => {
    animate(
      "span",
      { opacity: 1, filter: filter ? "blur(0px)" : "none" },
      { duration: duration ?? 1, delay: stagger(0.07) }
    );
  }, [scope.current]);

  const renderWords = () => (
    <motion.div ref={scope}>
      {wordsArray.map((word, idx) => {
        const clean = word.replace(/[.,!?¿¡;:"""]/g, "");
        const isHighlighted = highlightedWords?.includes(clean);
        return (
          <motion.span
            key={word + idx}
            className="opacity-0"
            style={{
              filter: filter ? "blur(10px)" : "none",
              color: isHighlighted && highlightColor ? highlightColor : undefined,
              fontWeight: isHighlighted ? 700 : undefined,
              backgroundColor: isHighlighted && highlightColor ? `${highlightColor}18` : undefined,
              borderRadius: isHighlighted ? "3px" : undefined,
              padding: isHighlighted ? "0 2px" : undefined,
            }}
          >
            {word}{" "}
          </motion.span>
        );
      })}
    </motion.div>
  );

  return (
    <div className={cn(className)}>
      <div className="text-base md:text-lg leading-loose text-slate-800 dark:text-slate-100">
        {renderWords()}
      </div>
    </div>
  );
};
