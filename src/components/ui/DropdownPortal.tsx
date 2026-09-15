"use client";

import { createPortal } from "react-dom";
import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";

/**
 * Renders floating menu content into document.body at a fixed position
 * computed from the anchor's bounding box. Dropdowns nested inside the
 * tracker grid's sticky/scrolling rows can't rely on position:absolute +
 * z-index — each sticky row is its own stacking context, so a popup can end
 * up rendered behind a later sibling row. Escaping to a portal sidesteps
 * that entirely.
 */
export function DropdownPortal({
  anchorRef,
  open,
  onClose,
  children,
  width,
  align = "left",
}: {
  anchorRef: RefObject<HTMLElement | null>;
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  width?: number;
  align?: "left" | "right";
}) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useLayoutEffect(() => {
    if (!open || !anchorRef.current) {
      setPos(null);
      return;
    }
    const rect = anchorRef.current.getBoundingClientRect();
    setPos({
      top: rect.bottom + 4,
      left: align === "right" ? rect.right - (width ?? rect.width) : rect.left,
    });
  }, [open, anchorRef, align, width]);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e: MouseEvent) {
      const target = e.target as Node;
      if (anchorRef.current?.contains(target)) return;
      if (contentRef.current?.contains(target)) return;
      onClose();
    }
    function handleScrollOrResize() {
      onClose();
    }
    document.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [open, onClose, anchorRef]);

  if (!open || !pos) return null;

  return createPortal(
    <div
      ref={contentRef}
      className="fixed z-[9999] max-h-72 overflow-y-auto rounded-md border border-slate-200 bg-white py-1 shadow-lg"
      style={{ top: pos.top, left: pos.left, width }}
    >
      {children}
    </div>,
    document.body
  );
}
