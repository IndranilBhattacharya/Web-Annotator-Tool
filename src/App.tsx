import { useRef, useState, useEffect, useCallback } from "react";
import { Check, Circle, Square, PenTool, ALargeSmall } from "lucide-react";
import { Card } from "@/components/ui/card";
import ThemeProvider from "@/components/context/theme-provider";
import { AnnotationShape } from "./types/annotation-shapes";
import { annotationColors } from "./constants/annotation-colors";
import { SyntheticBaseEvent } from "./types/synthetic-base-event";

let captureInterval: NodeJS.Timeout;
const FRAME_CAPTURE_INTERVAL = 1000;

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

  const onStopScreenShareHandling = useCallback(() => {
    if (!mediaStream) return;
    clearInterval(captureInterval);
    const tracks = mediaStream.getTracks();
    tracks.forEach((track) => track.stop());
  }, [mediaStream, setAnnotationSrc]);

  useEffect(() => {
    if (!mediaStream) return;
    const tracks = mediaStream.getTracks();

    captureInterval = setInterval(() => {
      const canvas = canvasRef?.current;
      if (!canvas) return;
      const canvasCtx = canvas.getContext("2d");
      if (!canvasCtx || !videoRef?.current) return;
      canvasCtx.lineCap = "round";
      canvasCtx.strokeStyle = annotationColor;
      canvasCtx.lineWidth = +annotationStrokeWidth;
      canvasCtx.imageSmoothingQuality = "high";
      [vw, vh, cw, ch] = [
        videoRef?.current?.videoWidth,
        videoRef?.current?.videoHeight,
        canvas?.width,
        canvas?.height,
      ];

      canvasCtx.drawImage(videoRef?.current, 0, 0, vw, vh, 0, 0, cw, ch);
    }, FRAME_CAPTURE_INTERVAL);

    tracks.forEach((track) => {
      track.addEventListener("ended", onStopScreenShareHandling);
    });

    return () => {
      clearInterval(captureInterval);
      tracks.forEach((track) => {
        track.removeEventListener("ended", onStopScreenShareHandling);
      });
    };
  }, [
    mediaStream,
    annotationColor,
    annotationStrokeWidth,
    onStopScreenShareHandling,
  ]);

  const onStartScreenSharingHandler = useCallback(async () => {
    try {
      const stream = await navigator?.mediaDevices?.getDisplayMedia({
        video: true,
      });
      if (!videoRef?.current) return;
      setMediaStream(stream);
      videoRef.current.srcObject = stream;
    } finally {
      setAnnotationSrc(null);
    }
  }, [setAnnotationSrc]);

  const startDrawing = async ({ nativeEvent }: SyntheticBaseEvent) => {
    if (!canvasCtx || !canvasRef?.current) return;

    const { offsetX, offsetY } = nativeEvent;
    canvasCtx?.beginPath();
    canvasCtx?.moveTo(offsetX, offsetY);
    setBeginCoords({ x: offsetX, y: offsetY });
    isAnnotating = true;

    lastFrameOfCanvas = await createImageBitmap(canvasRef?.current, {
      resizeWidth: vw,
      resizeHeight: vh,
      resizeQuality: "high",
      premultiplyAlpha: "premultiply",
    });

    if (annotationShape === "text") {
      setShowTextAnnotationDialog(true);
    }
  };

  const draw = ({ nativeEvent }: SyntheticBaseEvent) => {
    if (
      !isAnnotating ||
      !canvasRef?.current ||
      !videoRef?.current ||
      !canvasRef ||
      !canvasCtx
    ) {
      return;
    }
    const { offsetX, offsetY } = nativeEvent;
    if (annotationShape === "line") {
      canvasCtx.lineTo(offsetX, offsetY);
      canvasCtx.stroke();
      return;
    }

    if (annotationShape === "square") {
      const width = offsetX - beginCoords?.x;
      const height = offsetY - beginCoords?.y;

      canvasCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      canvasCtx.drawImage(lastFrameOfCanvas, 0, 0, vw, vh, 0, 0, cw, ch);

      canvasCtx.strokeRect(beginCoords?.x, beginCoords?.y, width, height);
      return;
    }

    if (annotationShape === "circle") {
      canvasCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      canvasCtx.drawImage(lastFrameOfCanvas, 0, 0, vw, vh, 0, 0, cw, ch);

      const radius = Math.sqrt(
        Math.pow(offsetX - beginCoords?.x, 2) +
          Math.pow(offsetY - beginCoords?.y, 2)
      );

      canvasCtx.beginPath();
      canvasCtx.arc(beginCoords?.x, beginCoords?.y, radius, 0, 2 * Math.PI);
      canvasCtx.stroke();
    }
  };

  return (
    <ThemeProvider>
      <main className="p-6 w-full gap-4 flex flex-col items-center">
        <Card className="w-full"></Card>
      </main>
    </ThemeProvider>
  );
};

export default App;
