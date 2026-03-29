"use client";

import { motion } from "framer-motion";

import { cn } from "@/lib/utils";

interface SlideTabItem<T extends string> {
  key: T;
  label: string;
}

interface SlideTabsProps<T extends string> {
  activeKey: T;
  className?: string;
  items: SlideTabItem<T>[];
  onChange: (key: T) => void;
}

export function SlideTabs<T extends string>({
  activeKey,
  className,
  items,
  onChange,
}: SlideTabsProps<T>) {
  return (
    <div
      className={cn(
        "inline-flex rounded-2xl border border-border/80 bg-card/80 p-1 shadow-sm backdrop-blur",
        className,
      )}
    >
      <ul className="relative flex flex-wrap items-center gap-1">
        {items.map((item) => {
          const isActive = item.key === activeKey;

          return (
            <li key={item.key} className="relative z-10">
              <button
                type="button"
                onClick={() => onChange(item.key)}
                className={cn(
                  "relative rounded-xl px-4 py-2 ui-text-medium font-medium transition-colors sm:px-5",
                  isActive
                    ? "text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
                )}
              >
                {isActive ? (
                  <motion.span
                    layoutId="slide-tabs-active-pill"
                    className="absolute inset-0 -z-10 rounded-xl bg-primary shadow-[0_10px_30px_-18px_rgba(37,99,235,0.85)]"
                    transition={{
                      damping: 30,
                      stiffness: 380,
                      type: "spring",
                    }}
                  />
                ) : null}
                {item.label}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
