import {
  SelectItem,
  SelectTrigger,
  SelectContent,
} from "@radix-ui/react-select";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { strokeWidths } from "@/constants/stroke-widths";
import { Select, SelectValue } from "@/components/ui/select";
import ThemeProvider from "@/components/context/theme-provider";
import { useRef, useState, useEffect, useCallback } from "react";
import { Check, Circle, Square, PenTool, ALargeSmall } from "lucide-react";
import {
  VIDEO_WIDTH,
  VIDEO_HEIGHT,
  CANVAS_HEIGHT,
} from "./constants/dimensions";
import { AnnotationShape } from "./types/annotation-shapes";
import { annotationShapes } from "./constants/annotation-shapes";
import { annotationColors } from "./constants/annotation-colors";
import { SyntheticBaseEvent } from "./types/synthetic-base-event";

let captureInterval: NodeJS.Timeout;
const FRAME_CAPTURE_INTERVAL = 2000;

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
  const [annotationSrc, setAnnotationSrc] = useState<HTMLVideoElement | null>(
    null
  );

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

    setAnnotationSrc(videoRef?.current);
  }, [mediaStream]);

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

  const onCommentAnnotationHandler = () => {
    if (!canvasCtx) return;

    canvasCtx.fillStyle = annotationColor;
    canvasCtx.font = "16px Arial";
    const textWidth = canvasCtx.measureText(annotationText).width;
    canvasCtx.fillText(
      annotationText,
      beginCoords?.x - textWidth / 2,
      beginCoords?.y
    );

    setAnnotationText("");
    setShowTextAnnotationDialog(false);
  };

  const endDrawing = () => {
    if (!canvasCtx) return;
    canvasCtx?.closePath();
    isAnnotating = false;
  };

  const onPenColorChangeHandler = (color: string) => {
    if (!canvasCtx) return;

    setAnnotationColor(color);
    canvasCtx.strokeStyle = color;
  };

  const lineStrokeWidthChangeHandler = (width: string) => {
    if (!canvasCtx) return;
    canvasCtx.lineWidth = +width;
    setAnnotationStrokeWidth(width);
  };

  const shapeChangeHandler = (newShape: AnnotationShape) => {
    setAnnotationShape(newShape);
    setShowTextAnnotationDialog(false);
  };

  return (
    <ThemeProvider>
      <main className="p-6 w-full gap-4 flex flex-col items-center">
        <Card className="w-full">
          <div className="p-4 w-full flex items-center justify-between">
            <span>
              {((): string => {
                if (!videoRef?.current) {
                  return "No preview available";
                } else if (annotationSrc) {
                  return "Make annotations";
                } else {
                  return "Preview";
                }
              })()}
            </span>
            <div className="gap-3 flex items-center">
              <Button variant="default" onClick={onStartScreenSharingHandler}>
                Share Tab/Screen
              </Button>
              <Button variant="outline" onClick={onStopScreenShareHandling}>
                Capture and Annotate
              </Button>
            </div>
          </div>
        </Card>

        <video
          muted
          autoPlay
          ref={videoRef}
          width={VIDEO_WIDTH}
          height={VIDEO_HEIGHT}
          className="rounded-lg"
          style={{
            display: ((): "none" | "block" => {
              if (annotationSrc || !mediaStream) {
                return "none";
              }
              return "block";
            })(),
          }}
        />

        <div
          className={`relative w-full flex items-center ${
            annotationSrc ? "block" : "hidden"
          }`}
        >
          <canvas
            ref={canvasRef}
            className="rounded-lg"
            width={VIDEO_WIDTH}
            height={CANVAS_HEIGHT}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={endDrawing}
            onBlur={endDrawing}
          />
          <div className="absolute gap-4 top-1/4 right-0 flex flex-col">
            <Select
              value={annotationColor}
              onValueChange={onPenColorChangeHandler}
            >
              <SelectTrigger>
                <SelectValue>
                  <div
                    className="p-2.5 rounded-full"
                    style={{ backgroundColor: annotationColor }}
                  ></div>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {annotationColors?.map((color) => (
                  <SelectItem key={color} value={color}>
                    <div
                      style={{ backgroundColor: color }}
                      className="p-2.5 rounded-full"
                    ></div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={annotationStrokeWidth}
              onValueChange={lineStrokeWidthChangeHandler}
            >
              <SelectTrigger>
                <SelectValue>{`${annotationStrokeWidth} px`}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {strokeWidths?.map((width) => (
                  <SelectItem key={width} value={width}>
                    {`${width} px`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={annotationShape} onValueChange={shapeChangeHandler}>
              <SelectTrigger>
                <SelectValue>{annotationShapeJSX(annotationShape)}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {annotationShapes?.map((shape) => (
                  <SelectItem key={shape} value={shape}>
                    {annotationShapeJSX(shape)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </main>
      {showTextAnnotationDialog && (
        <Card
          className="p-2 w-[30vw] absolute"
          style={{
            top: beginCoords?.y,
            left: beginCoords?.x,
          }}
        >
          <div className="gap-3 flex w-full items-center">
            <Input
              type="text"
              value={annotationText}
              placeholder="Put your comment here"
              onChange={({ target: { value } }) => setAnnotationText(value)}
            />
            <Button
              variant="secondary"
              className="px-2 py-0"
              onClick={onCommentAnnotationHandler}
            >
              <Check />
            </Button>
          </div>
        </Card>
      )}
    </ThemeProvider>
  );
};

export default App;
