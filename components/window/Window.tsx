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

type SnapPosition = "left" | "right" | "max" | null;

const EDGE_THRESHOLD = 30;

const Window = forwardRef<{ handleDrag: () => void; handleStop: () => void; handleKeyDown: (e: any) => void; }, WindowProps>(
  ({ children }, ref) => {
    const nodeRef = useRef<HTMLDivElement>(null);
    const [snapPreview, setSnapPreview] = useState<SnapPreview | null>(null);
    const [snapPosition, setSnapPosition] = useState<SnapPosition>(null);
    const [snapped, setSnapped] = useState<SnapPosition>(null);
    const [width, setWidth] = useState(60);
    const [height, setHeight] = useState(85);

    const checkSnapPreview: DraggableEventHandler = () => {
      const node = nodeRef.current;
      if (!node) return;
      const rect = node.getBoundingClientRect();

      if (rect.left <= EDGE_THRESHOLD) {
        setSnapPreview({ left: "0", top: "0", width: "50%", height: "100%" });
        setSnapPosition("left");
      } else if (rect.right >= window.innerWidth - EDGE_THRESHOLD) {
        setSnapPreview({ left: "50%", top: "0", width: "50%", height: "100%" });
        setSnapPosition("right");
      } else if (rect.top <= EDGE_THRESHOLD) {
        setSnapPreview({ left: "0", top: "0", width: "100%", height: "100%" });
        setSnapPosition("max");
      } else if (snapPreview) {
        setSnapPreview(null);
        setSnapPosition(null);
      }
    };

    const dragTimeout = useRef<number>();
    const handleDrag: DraggableEventHandler = (...args) => {
      if (dragTimeout.current) window.clearTimeout(dragTimeout.current);
      dragTimeout.current = window.setTimeout(() => checkSnapPreview(...args), 50);
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

    return (
      <>
        {snapPreview && (
          <div
            data-testid="snap-preview"
            className="fixed z-50 pointer-events-none border-2 border-dashed border-white bg-white bg-opacity-20"
            style={snapPreview}
          />
        )}
        <Draggable onDrag={handleDrag} onStop={handleStop} nodeRef={nodeRef}>
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
