export enum GestureState {
  NONE = "NONE",
  DRAW = "DRAW", // 1 index finger
  ERASE_SMALL = "ERASE_SMALL", // 2 fingers
  ERASE_LARGE = "ERASE_LARGE", // 3 fingers
  COLOR_CHANGE = "COLOR_CHANGE", // Pinch
  FIST = "FIST", // Closed fist
  THUMBS_UP = "THUMBS_UP",
  OPEN_PALM = "OPEN_PALM",
}

export interface BrushSettings {
  color: string;
  size: number;
}
