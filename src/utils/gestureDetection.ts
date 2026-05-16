import { NormalizedLandmark } from "@mediapipe/tasks-vision";
import { GestureState } from "../types";

export const calculateDistance = (
  p1: NormalizedLandmark,
  p2: NormalizedLandmark,
) => {
  return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
};

export const detectGesture = (
  landmarks: NormalizedLandmark[],
): { state: GestureState; confidence: number } => {
  if (!landmarks || landmarks.length < 21)
    return { state: GestureState.NONE, confidence: 0 };

  // Calculate distances to wrist (0)
  const wrist = landmarks[0];

  // A finger is considered "up" if its tip is further from the wrist than its PIP joint
  // But purely relying on y-coordinate is simpler for a 2D air board
  // We'll combine y-coord and distance

  const typeUp = (tip: number, mcp: number) => {
    return (
      landmarks[tip].y < landmarks[mcp].y &&
      calculateDistance(landmarks[tip], wrist) >
        calculateDistance(landmarks[mcp], wrist) * 1.2
    );
  };

  const isIndexUp = typeUp(8, 5);
  const isMiddleUp = typeUp(12, 9);
  const isRingUp = typeUp(16, 13);
  const isPinkyUp = typeUp(20, 17);

  const isThumbUp =
    landmarks[4].y < landmarks[3].y &&
    calculateDistance(landmarks[4], wrist) >
      calculateDistance(landmarks[3], wrist) * 1.1;

  // Open Palm
  const isOpenPalm =
    isThumbUp && isIndexUp && isMiddleUp && isRingUp && isPinkyUp;

  // Thumbs Up
  const isThumbsUpOnly =
    isThumbUp && !isIndexUp && !isMiddleUp && !isRingUp && !isPinkyUp;

  // Pinch
  const pinchDist = calculateDistance(landmarks[4], landmarks[8]);
  const isPinching = pinchDist < 0.05 && !isMiddleUp && !isRingUp && !isPinkyUp;

  // Fist
  const isFist =
    !isThumbUp && !isIndexUp && !isMiddleUp && !isRingUp && !isPinkyUp;

  if (isOpenPalm) return { state: GestureState.OPEN_PALM, confidence: 0.9 };
  if (isThumbsUpOnly) return { state: GestureState.THUMBS_UP, confidence: 0.9 };

  if (isPinching)
    return {
      state: GestureState.COLOR_CHANGE,
      confidence: Math.max(0, 1 - pinchDist * 10),
    };
  if (isFist) return { state: GestureState.FIST, confidence: 0.9 };

  // 3 Fingers UP
  if (isIndexUp && isMiddleUp && isRingUp && !isPinkyUp)
    return { state: GestureState.ERASE_LARGE, confidence: 0.85 };

  // 2 Fingers UP
  if (isIndexUp && isMiddleUp && !isRingUp && !isPinkyUp)
    return { state: GestureState.ERASE_SMALL, confidence: 0.9 };

  // 1 Finger UP (DRAW)
  if (isIndexUp && !isMiddleUp && !isRingUp && !isPinkyUp) {
    // strict check for drawing
    const indexTip = landmarks[8];
    const indexBase = landmarks[5];
    const indexLength = calculateDistance(indexTip, indexBase);
    const middleLength = calculateDistance(landmarks[12], landmarks[9]);

    // Confidence based on index extension vs middle curl
    let conf = 0.7;
    if (indexLength > 0.1) conf += 0.2;
    if (middleLength < 0.05) conf += 0.1;

    return { state: GestureState.DRAW, confidence: conf };
  }

  return { state: GestureState.NONE, confidence: 0 };
};
