import { useState, useRef, useEffect, useCallback } from 'react';

interface UseMindmapCanvasOptions {
  minZoom?: number;
  maxZoom?: number;
  zoomStep?: number;
  initialZoom?: number;
}

export function useMindmapCanvas(options: UseMindmapCanvasOptions = {}) {
  const {
    minZoom = 0.3,
    maxZoom = 2.5,
    zoomStep = 0.12,
    initialZoom = 1,
  } = options;

  const [zoom, setZoom] = useState(initialZoom);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const viewportRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);

  const zoomRef = useRef(zoom);
  const panRef = useRef(pan);
  zoomRef.current = zoom;
  panRef.current = pan;

  // Drag tracking refs
  const dragRef = useRef({
    isDown: false,
    startX: 0,
    startY: 0,
    startPanX: 0,
    startPanY: 0,
    isPinching: false,
    initialTouchDist: 0,
    initialZoom: 1,
    initialMidX: 0,
    initialMidY: 0,
  });

  // Toggle fullscreen
  const toggleFullscreen = useCallback(() => {
    setIsFullscreen((prev) => !prev);
  }, []);

  // Center / Reset View
  const resetView = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  // Zoom In / Out
  const zoomIn = useCallback(() => {
    setZoom((z) => Math.min(maxZoom, +(z + zoomStep).toFixed(2)));
  }, [maxZoom, zoomStep]);

  const zoomOut = useCallback(() => {
    setZoom((z) => Math.max(minZoom, +(z - zoomStep).toFixed(2)));
  }, [minZoom, zoomStep]);

  // Double Click on canvas to reset center
  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button, input, textarea, a, .node-interactive')) return;
    resetView();
  }, [resetView]);

  // Keyboard Navigation (+, -, 0, Escape, Arrow keys)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an input or textarea
      const activeTag = (document.activeElement?.tagName || '').toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea') return;

      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      } else if (e.key === '+' || e.key === '=') {
        zoomIn();
      } else if (e.key === '-') {
        zoomOut();
      } else if (e.key === '0') {
        resetView();
      } else if (e.key === 'ArrowLeft') {
        setPan((p) => ({ ...p, x: p.x + 50 }));
      } else if (e.key === 'ArrowRight') {
        setPan((p) => ({ ...p, x: p.x - 50 }));
      } else if (e.key === 'ArrowUp') {
        setPan((p) => ({ ...p, y: p.y + 50 }));
      } else if (e.key === 'ArrowDown') {
        setPan((p) => ({ ...p, y: p.y - 50 }));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen, zoomIn, zoomOut, resetView]);

  // Wheel listener: 2D Pan with mouse wheel/trackpad, Zoom with Ctrl+wheel or pinch
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = viewport.getBoundingClientRect();
      const currentZoom = zoomRef.current;
      const currentPan = panRef.current;

      // If pinch or Ctrl+wheel -> Zoom around cursor
      if (e.ctrlKey || e.metaKey) {
        const zoomDelta = -e.deltaY * 0.006;
        const targetZoom = Math.min(maxZoom, Math.max(minZoom, currentZoom * (1 + zoomDelta)));

        const cursorX = e.clientX - rect.left - rect.width / 2;
        const cursorY = e.clientY - rect.top - rect.height / 2;

        const ratio = targetZoom / currentZoom;
        const newPanX = cursorX - (cursorX - currentPan.x) * ratio;
        const newPanY = cursorY - (cursorY - currentPan.y) * ratio;

        setZoom(targetZoom);
        setPan({ x: newPanX, y: newPanY });
      } else {
        // Natural 4-direction Pan (Left, Right, Up, Down)
        setPan((prev) => ({
          x: prev.x - e.deltaX,
          y: prev.y - e.deltaY,
        }));
      }
    };

    viewport.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      viewport.removeEventListener('wheel', handleWheel);
    };
  }, [minZoom, maxZoom]);

  // Touch Event Listeners: 1-finger 4-direction Pan, 2-finger Pinch-to-Zoom
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        const target = e.target as HTMLElement;
        if (target.closest('button, input, textarea, a, .node-interactive')) return;

        const t = e.touches[0];
        dragRef.current.isDown = true;
        dragRef.current.isPinching = false;
        dragRef.current.startX = t.clientX;
        dragRef.current.startY = t.clientY;
        dragRef.current.startPanX = panRef.current.x;
        dragRef.current.startPanY = panRef.current.y;
        setIsDragging(true);
      } else if (e.touches.length === 2) {
        e.preventDefault();
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
        const midX = (t1.clientX + t2.clientX) / 2;
        const midY = (t1.clientY + t2.clientY) / 2;

        dragRef.current.isPinching = true;
        dragRef.current.isDown = false;
        dragRef.current.initialTouchDist = dist;
        dragRef.current.initialZoom = zoomRef.current;
        dragRef.current.initialMidX = midX;
        dragRef.current.initialMidY = midY;
        dragRef.current.startPanX = panRef.current.x;
        dragRef.current.startPanY = panRef.current.y;
        setIsDragging(true);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (dragRef.current.isPinching && e.touches.length === 2) {
        e.preventDefault();
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
        const midX = (t1.clientX + t2.clientX) / 2;
        const midY = (t1.clientY + t2.clientY) / 2;

        if (dragRef.current.initialTouchDist > 0) {
          const scale = dist / dragRef.current.initialTouchDist;
          const targetZoom = Math.min(
            maxZoom,
            Math.max(minZoom, dragRef.current.initialZoom * scale)
          );
          const rect = viewport.getBoundingClientRect();

          const focalX = midX - rect.left - rect.width / 2;
          const focalY = midY - rect.top - rect.height / 2;

          const shiftX = midX - dragRef.current.initialMidX;
          const shiftY = midY - dragRef.current.initialMidY;

          const ratio = targetZoom / dragRef.current.initialZoom;
          const newPanX =
            dragRef.current.startPanX + shiftX - (focalX - dragRef.current.startPanX) * (ratio - 1);
          const newPanY =
            dragRef.current.startPanY + shiftY - (focalY - dragRef.current.startPanY) * (ratio - 1);

          setZoom(targetZoom);
          setPan({ x: newPanX, y: newPanY });
        }
      } else if (dragRef.current.isDown && e.touches.length === 1) {
        e.preventDefault();
        const t = e.touches[0];
        const dx = t.clientX - dragRef.current.startX;
        const dy = t.clientY - dragRef.current.startY;
        setPan({
          x: dragRef.current.startPanX + dx,
          y: dragRef.current.startPanY + dy,
        });
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (e.touches.length === 0) {
        dragRef.current.isDown = false;
        dragRef.current.isPinching = false;
        setIsDragging(false);
      } else if (e.touches.length === 1) {
        // Transition back to 1-finger pan smoothly
        const t = e.touches[0];
        dragRef.current.isPinching = false;
        dragRef.current.isDown = true;
        dragRef.current.startX = t.clientX;
        dragRef.current.startY = t.clientY;
        dragRef.current.startPanX = panRef.current.x;
        dragRef.current.startPanY = panRef.current.y;
      }
    };

    viewport.addEventListener('touchstart', handleTouchStart, { passive: false });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);
    window.addEventListener('touchcancel', handleTouchEnd);

    return () => {
      viewport.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [minZoom, maxZoom]);

  // Mouse drag handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button, input, textarea, a, .node-interactive')) return;
    setIsDragging(true);
    dragRef.current.isDown = true;
    dragRef.current.startX = e.clientX;
    dragRef.current.startY = e.clientY;
    dragRef.current.startPanX = panRef.current.x;
    dragRef.current.startPanY = panRef.current.y;
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragRef.current.isDown) return;
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      setPan({
        x: dragRef.current.startPanX + dx,
        y: dragRef.current.startPanY + dy,
      });
    };

    const handleMouseUp = () => {
      if (dragRef.current.isDown) {
        dragRef.current.isDown = false;
        setIsDragging(false);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  return {
    zoom,
    setZoom,
    pan,
    setPan,
    isDragging,
    isFullscreen,
    toggleFullscreen,
    resetView,
    zoomIn,
    zoomOut,
    viewportRef,
    worldRef,
    handleMouseDown,
    handleDoubleClick,
  };
}
