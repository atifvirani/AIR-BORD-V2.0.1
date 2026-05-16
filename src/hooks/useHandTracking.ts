import { useEffect, useRef, useState } from "react";
import {
  FilesetResolver,
  HandLandmarker,
  HandLandmarkerResult,
} from "@mediapipe/tasks-vision";

export const useHandTracking = (videoElement: HTMLVideoElement | null) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const handLandmarkerRef = useRef<HandLandmarker | null>(null);
  const lastVideoTimeRef = useRef(-1);

  useEffect(() => {
    let active = true;

    const initHandTracking = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm",
        );

        if (!active) return;

        const handLandmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          numHands: 1,
          minHandDetectionConfidence: 0.7,
          minHandPresenceConfidence: 0.7,
          minTrackingConfidence: 0.7,
        });

        if (!active) {
          handLandmarker.close();
          return;
        }

        handLandmarkerRef.current = handLandmarker;
        setIsLoaded(true);
      } catch (error) {
        console.error("Failed to initialize HandLandmarker:", error);
      }
    };

    initHandTracking();

    return () => {
      active = false;
      if (handLandmarkerRef.current) {
        handLandmarkerRef.current.close();
        handLandmarkerRef.current = null;
      }
    };
  }, []);

  const detectFrame = (): HandLandmarkerResult | null => {
    if (!handLandmarkerRef.current || !videoElement) return null;

    const nowInMs = Date.now();

    // Process video frame if it is ready
    if (
      videoElement.readyState >= 2 &&
      videoElement.videoWidth > 0 &&
      videoElement.currentTime !== lastVideoTimeRef.current
    ) {
      lastVideoTimeRef.current = videoElement.currentTime;
      return handLandmarkerRef.current.detectForVideo(videoElement, nowInMs);
    }

    return null;
  };

  return { isLoaded, detectFrame };
};
