import React, {
  useImperativeHandle,
  useRef,
  useState,
  forwardRef,
} from "react";
import Draggable, { DraggableEventHandler } from "react-draggable";

interface WindowProps {
  children: React.ReactNode;
}

interface SnapPreview {
  left: string;
  top: string;
  width: string;
  height: string;
}

type SnapPosition =
  | "left"
  | "right"
  | "top"
  | "bottom"
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right"
  | "left-third"
  | "center-third"
  | "right-third"
  | "max"
  | null;

const EDGE_THRESHOLD = 30;

const Window = forwardRef<{ handleDrag: () => void; handleStop: () => void; handleKeyDown: (e: any) => void; }, WindowProps>(
  ({ children }, ref) => {
    const nodeRef = useRef<HTMLDivElement>(null);
    const [snapPreview, setSnapPreview] = useState<SnapPreview | null>(null);
    const [snapPosition, setSnapPosition] = useState<SnapPosition>(null);
    const [snapped, setSnapped] = useState<SnapPosition>(null);
    const [width, setWidth] = useState(60);
    const [height, setHeight] = useState(85);
    const [dragging, setDragging] = useState(false);

    const checkSnapPreview: DraggableEventHandler = () => {
      const node = nodeRef.current;
      if (!node) return;
      const rect = node.getBoundingClientRect();
      const midX = rect.left + rect.width / 2;
      const thirdW = window.innerWidth / 3;

      if (rect.left <= EDGE_THRESHOLD && rect.top <= EDGE_THRESHOLD) {
        setSnapPreview({ left: "0", top: "0", width: "50%", height: "50%" });
        setSnapPosition("top-left");
      } else if (rect.right >= window.innerWidth - EDGE_THRESHOLD && rect.top <= EDGE_THRESHOLD) {
        setSnapPreview({ left: "50%", top: "0", width: "50%", height: "50%" });
        setSnapPosition("top-right");
      } else if (rect.left <= EDGE_THRESHOLD && rect.bottom >= window.innerHeight - EDGE_THRESHOLD) {
        setSnapPreview({ left: "0", top: "50%", width: "50%", height: "50%" });
        setSnapPosition("bottom-left");
      } else if (rect.right >= window.innerWidth - EDGE_THRESHOLD && rect.bottom >= window.innerHeight - EDGE_THRESHOLD) {
        setSnapPreview({ left: "50%", top: "50%", width: "50%", height: "50%" });
        setSnapPosition("bottom-right");
      } else if (rect.top <= EDGE_THRESHOLD) {
        setSnapPreview({ left: "0", top: "0", width: "100%", height: "50%" });
        setSnapPosition("top");
      } else if (rect.bottom >= window.innerHeight - EDGE_THRESHOLD) {
        setSnapPreview({ left: "0", top: "50%", width: "100%", height: "50%" });
        setSnapPosition("bottom");
      } else if (rect.left <= EDGE_THRESHOLD) {
        setSnapPreview({ left: "0", top: "0", width: "50%", height: "100%" });
        setSnapPosition("left");
      } else if (rect.right >= window.innerWidth - EDGE_THRESHOLD) {
        setSnapPreview({ left: "50%", top: "0", width: "50%", height: "100%" });
        setSnapPosition("right");
      } else if (midX < thirdW) {
        setSnapPreview({ left: "0", top: "0", width: "33.33%", height: "100%" });
        setSnapPosition("left-third");
      } else if (midX >= thirdW && midX < 2 * thirdW) {
        setSnapPreview({ left: "33.33%", top: "0", width: "33.33%", height: "100%" });
        setSnapPosition("center-third");
      } else if (midX >= 2 * thirdW) {
        setSnapPreview({ left: "66.66%", top: "0", width: "33.33%", height: "100%" });
        setSnapPosition("right-third");
      } else if (snapPreview) {
        setSnapPreview(null);
        setSnapPosition(null);
      }
    };

    const handleDrag: DraggableEventHandler = (...args) => {
      setDragging(true);
      checkSnapPreview(...args);
    };

    const snapWindow = (pos: SnapPosition) => {
      const node = nodeRef.current;
      if (!node || !pos) return;
      if (pos === "left") {
        node.style.transform = `translate(0px, 0px)`;
        setWidth(50);
        setHeight(100);
      } else if (pos === "right") {
        node.style.transform = `translate(${window.innerWidth / 2}px, 0px)`;
        setWidth(50);
        setHeight(100);
      } else if (pos === "top") {
        node.style.transform = `translate(0px, 0px)`;
        setWidth(100);
        setHeight(50);
      } else if (pos === "bottom") {
        node.style.transform = `translate(0px, ${window.innerHeight / 2}px)`;
        setWidth(100);
        setHeight(50);
      } else if (pos === "top-left") {
        node.style.transform = `translate(0px, 0px)`;
        setWidth(50);
        setHeight(50);
      } else if (pos === "top-right") {
        node.style.transform = `translate(${window.innerWidth / 2}px, 0px)`;
        setWidth(50);
        setHeight(50);
      } else if (pos === "bottom-left") {
        node.style.transform = `translate(0px, ${window.innerHeight / 2}px)`;
        setWidth(50);
        setHeight(50);
      } else if (pos === "bottom-right") {
        node.style.transform = `translate(${window.innerWidth / 2}px, ${window.innerHeight / 2}px)`;
        setWidth(50);
        setHeight(50);
      } else if (pos === "left-third") {
        node.style.transform = `translate(0px, 0px)`;
        setWidth(33.33);
        setHeight(100);
      } else if (pos === "center-third") {
        node.style.transform = `translate(${window.innerWidth / 3}px, 0px)`;
        setWidth(33.33);
        setHeight(100);
      } else if (pos === "right-third") {
        node.style.transform = `translate(${(2 * window.innerWidth) / 3}px, 0px)`;
        setWidth(33.33);
        setHeight(100);
      } else if (pos === "max") {
        node.style.transform = `translate(0px, 0px)`;
        setWidth(100);
        setHeight(96.3);
      }
      setSnapped(pos);
    };

    const handleStop: DraggableEventHandler = () => {
      snapWindow(snapPosition);
      setSnapPreview(null);
      setSnapPosition(null);
      setDragging(false);
    };

    const handleKeyDown = (e: any) => {
      if (snapPreview && e.key === "Escape") {
        e.preventDefault?.();
        e.stopPropagation?.();
        setSnapPreview(null);
        setSnapPosition(null);
        return;
      }
      if (e.altKey) {
        if (e.key === "ArrowLeft") {
          e.preventDefault?.();
          snapWindow("left");
        } else if (e.key === "ArrowRight") {
          e.preventDefault?.();
          snapWindow("right");
        } else if (e.key === "ArrowUp") {
          e.preventDefault?.();
          snapWindow("max");
        }
      }
    };

    useImperativeHandle(ref, () => ({ handleDrag, handleStop, handleKeyDown }));

    const guides: SnapPreview[] = [
      { left: "0", top: "0", width: "50%", height: "100%" },
      { left: "50%", top: "0", width: "50%", height: "100%" },
      { left: "0", top: "0", width: "100%", height: "50%" },
      { left: "0", top: "50%", width: "100%", height: "50%" },
      { left: "0", top: "0", width: "50%", height: "50%" },
      { left: "50%", top: "0", width: "50%", height: "50%" },
      { left: "0", top: "50%", width: "50%", height: "50%" },
      { left: "50%", top: "50%", width: "50%", height: "50%" },
      { left: "0", top: "0", width: "33.33%", height: "100%" },
      { left: "33.33%", top: "0", width: "33.33%", height: "100%" },
      { left: "66.66%", top: "0", width: "33.33%", height: "100%" },
    ];

    return (
      <>
        {dragging &&
          guides.map((g, i) => (
            <div
              key={i}
              className="fixed z-40 pointer-events-none border border-dashed border-white/20 bg-white/5"
              style={g}
            />
          ))}
        {snapPreview && (
          <div
            data-testid="snap-preview"
            className="fixed z-50 pointer-events-none border-2 border-dashed border-white bg-white bg-opacity-20"
            style={snapPreview}
          />
        )}
        <Draggable onStart={() => setDragging(true)} onDrag={handleDrag} onStop={handleStop} nodeRef={nodeRef}>
          <div
            ref={nodeRef}
            tabIndex={0}
            onKeyDown={handleKeyDown}
            style={{ width: `${width}%`, height: `${height}%` }}
          >
            {children}
          </div>
        </Draggable>
      </>
    );
  }
);

export default Window;
