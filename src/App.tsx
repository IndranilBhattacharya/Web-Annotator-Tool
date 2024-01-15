import { useRef, useState, useEffect, useCallback } from "react";
import { Check, Circle, Square, PenTool, ALargeSmall } from "lucide-react";
import { Card } from "@/components/ui/card";
import ThemeProvider from "@/components/context/theme-provider";
import { AnnotationShape } from "./types/annotation-shapes";
import { annotationColors } from "./constants/annotation-colors";

let captureInterval: NodeJS.Timeout;

let isAnnotating = false;
let canvasCtx!: CanvasRenderingContext2D;
let lastFrameOfCanvas: CanvasImageSource;

let [vw, vh, cw, ch] = Array.from({ length: 4 }, () => 0);

const annotationShapeJSX = (shapeType: AnnotationShape) => {
  switch (shapeType) {
    case "line":
      return <PenTool />;
    case "square":
      return <Square />;
    case "circle":
      return <Circle />;
    default:
      return <ALargeSmall />;
  }
};

const App = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [annotationSrc, setAnnotationSrc] = useState<MediaStream | null>(null);

  const [annotationShape, setAnnotationShape] =
    useState<AnnotationShape>("line");
  const [annotationStrokeWidth, setAnnotationStrokeWidth] = useState("1");
  const [annotationColor, setAnnotationColor] = useState(annotationColors[1]);

  const [annotationText, setAnnotationText] = useState("");
  const [showTextAnnotationDialog, setShowTextAnnotationDialog] =
    useState(false);

  const [beginCoords, setBeginCoords] = useState({ x: 0, y: 0 });

  return (
    <ThemeProvider>
      <main className="p-6 w-full gap-4 flex flex-col items-center">
        <Card className="w-full"></Card>
      </main>
    </ThemeProvider>
  );
};

export default App;
