import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Camera, RefreshCw, Check, X } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  onCapture: (dataUrl: string) => void;
};

export function CameraCapture({ open, onClose, onCapture }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [shot, setShot] = useState("");
  const [error, setError] = useState("");

  const stop = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  const start = async () => {
    setError("");
    setShot("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 720, height: 720 },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch {
      setError("Camera nahi khul paya. Browser me permission allow karo.");
    }
  };

  useEffect(() => {
    if (open) start();
    else stop();
    return stop;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const takeShot = () => {
    const video = videoRef.current;
    if (!video) return;

    const size = Math.min(video.videoWidth, video.videoHeight);
    const canvas = document.createElement("canvas");
    canvas.width = 480;
    canvas.height = 560;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(
      video,
      (video.videoWidth - size) / 2,
      (video.videoHeight - size) / 2,
      size,
      size,
      0,
      0,
      480,
      560
    );

    setShot(canvas.toDataURL("image/jpeg", 0.85));
    stop();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Live Photo Capture
          </DialogTitle>
        </DialogHeader>

        <div className="overflow-hidden rounded-xl border-2 bg-black">
          {error ? (
            <div className="p-10 text-center text-sm text-white">{error}</div>
          ) : shot ? (
            <img src={shot} alt="Captured" className="w-full" />
          ) : (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full scale-x-[-1]"
            />
          )}
        </div>

        <div className="flex gap-2">
          {shot ? (
            <>
              <Button variant="outline" className="flex-1" onClick={start}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Dobara Lo
              </Button>
              <Button
                className="flex-1"
                onClick={() => {
                  onCapture(shot);
                  onClose();
                }}
              >
                <Check className="mr-2 h-4 w-4" />
                Use Photo
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" className="flex-1" onClick={onClose}>
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
              <Button className="flex-1" onClick={takeShot} disabled={!!error}>
                <Camera className="mr-2 h-4 w-4" />
                Capture
              </Button>
            </>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Camera sirf <b>https</b> ya <b>localhost</b> pe chalta hai
        </p>
      </DialogContent>
    </Dialog>
  );
}