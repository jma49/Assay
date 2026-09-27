import { useCallback, useEffect, useRef, useState } from "react";

/**
 * A draggable horizontal scrollbar kept in sync with a scroll container.
 * `contentKey` should change whenever the container's content does, so the
 * bar is re-measured.
 */
export function useDragScrollbar(contentKey: unknown) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollBarRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showScrollBar, setShowScrollBar] = useState(false);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const dragStartRef = useRef({ startX: 0, startScrollLeft: 0, startScrollBarLeft: 0 });

  const updateScrollBarPosition = useCallback(() => {
    const container = scrollContainerRef.current;
    const scrollBar = scrollBarRef.current;
    if (!container || !scrollBar || isDragging) return;

    const scrollRatio = container.scrollLeft / Math.max(1, container.scrollWidth - container.clientWidth);
    const scrollBarTrackWidth = scrollBar.parentElement!.clientWidth;
    const scrollBarWidth = scrollBar.clientWidth;
    const maxScrollBarLeft = Math.max(0, scrollBarTrackWidth - scrollBarWidth);

    scrollBar.style.transform = `translateX(${scrollRatio * maxScrollBarLeft}px)`;
  }, [isDragging]);

  useEffect(() => {
    const checkScrollBar = () => {
      if (!scrollContainerRef.current) return;
      const { scrollWidth, clientWidth } = scrollContainerRef.current;
      // 1px tolerance for sub-pixel rounding.
      const needsScrollBar = scrollWidth > clientWidth + 1;
      setShowScrollBar(needsScrollBar);
      if (needsScrollBar) requestAnimationFrame(updateScrollBarPosition);
    };

    checkScrollBar();
    const handleResize = () => {
      requestAnimationFrame(checkScrollBar);
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [contentKey, updateScrollBarPosition]);

  useEffect(() => {
    if (contentKey && showScrollBar) {
      // Wait two frames so the table has been laid out before measuring.
      requestAnimationFrame(() => {
        requestAnimationFrame(updateScrollBarPosition);
      });
    }
  }, [contentKey, showScrollBar, updateScrollBarPosition]);

  // Only the thumb itself starts a drag; clicks on the track do nothing.
  const handleScrollBarMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);

    const container = scrollContainerRef.current;
    const scrollBar = scrollBarRef.current;
    if (!container || !scrollBar) return;

    const currentTransform = scrollBar.style.transform;
    const currentLeft = parseFloat(currentTransform.replace("translateX(", "").replace("px)", "") || "0");

    dragStartRef.current = {
      startX: e.clientX,
      startScrollLeft: container.scrollLeft,
      startScrollBarLeft: currentLeft,
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);

      animationFrameRef.current = requestAnimationFrame(() => {
        const container = scrollContainerRef.current;
        const scrollBar = scrollBarRef.current;
        if (!container || !scrollBar) return;

        const deltaX = e.clientX - dragStartRef.current.startX;
        const trackWidth = scrollBar.parentElement!.clientWidth;
        const scrollBarWidth = scrollBar.clientWidth;
        const maxScrollBarLeft = Math.max(0, trackWidth - scrollBarWidth);

        const newScrollBarLeft = Math.max(
          0,
          Math.min(maxScrollBarLeft, dragStartRef.current.startScrollBarLeft + deltaX),
        );

        const scrollRatio = maxScrollBarLeft > 0 ? newScrollBarLeft / maxScrollBarLeft : 0;
        const maxScrollLeft = Math.max(0, container.scrollWidth - container.clientWidth);

        container.scrollLeft = scrollRatio * maxScrollLeft;
        scrollBar.style.transform = `translateX(${newScrollBarLeft}px)`;
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const handleContainerScroll = () => {
    if (isDragging) return;
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    animationFrameRef.current = requestAnimationFrame(updateScrollBarPosition);
  };

  return {
    scrollContainerRef,
    scrollBarRef,
    isDragging,
    showScrollBar,
    handleScrollBarMouseDown,
    handleContainerScroll,
  };
}
