import React, { useRef, useState } from "react";
import Draggable, { DraggableEventHandler } from "react-draggable";

interface DragSnapHandlerProps {
  children: React.ReactNode;
}

interface SnapPreview {
  left: string;
  top: string;
  width: string;
  height: string;
}

type SnapPosition = "left" | "right" | "top" | null;

const EDGE_THRESHOLD = 30;

const DragSnapHandler: React.FC<DragSnapHandlerProps> = ({ children }) => {
  const nodeRef = useRef<HTMLDivElement>(null);
  const [snapPreview, setSnapPreview] = useState<SnapPreview | null>(null);
  const [snapPosition, setSnapPosition] = useState<SnapPosition>(null);

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
      setSnapPreview({ left: "0", top: "0", width: "100%", height: "50%" });
      setSnapPosition("top");
    } else if (snapPreview) {
      setSnapPreview(null);
      setSnapPosition(null);
    }
  };

  const handleStop: DraggableEventHandler = () => {
    const node = nodeRef.current;
    if (!node) return;

    if (snapPosition === "left") {
      node.style.transform = `translate(0px, 0px)`;
      node.style.width = "50%";
      node.style.height = "100%";
    } else if (snapPosition === "right") {
      node.style.transform = `translate(${window.innerWidth / 2}px, 0px)`;
      node.style.width = "50%";
      node.style.height = "100%";
    } else if (snapPosition === "top") {
      node.style.transform = `translate(0px, 0px)`;
      node.style.width = "100%";
      node.style.height = "50%";
    }

    setSnapPreview(null);
    setSnapPosition(null);
  };

  return (
    <>
      {snapPreview && (
        <div
          data-testid="snap-preview"
          className="fixed z-50 pointer-events-none border-2 border-dashed border-white bg-white bg-opacity-20"
          style={snapPreview}
        />
      )}
      <Draggable
        onDrag={checkSnapPreview}
        onStop={handleStop}
        nodeRef={nodeRef}
      >
        <div ref={nodeRef}>{children}</div>
      </Draggable>
    </>
  );
};

export default DragSnapHandler;
