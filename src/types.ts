export type { Circle, CircleLine, State, Action, NoteType };
export { Constants, Viewport };

const Viewport = {
  CANVAS_WIDTH: 200,
  CANVAS_HEIGHT: 400,
} as const;

const Constants = {
  TICK_RATE_MS: 6,
  // SONG_NAME: "RockinRobin",
  SONG_NAME: "ComparedChild",
  // SONG_NAME: "ComparedChildNoBG",
  // SONG_NAME: "BusToAnotherWorld",
  // SONG_NAME: "UnderKids",
  // SONG_NAME: "RainingAfterAll",
  // SONG_NAME: "LowAsDirt",
  // SONG_NAME: "TestHold",
  // SONG_NAME: "DifficultMode",
  // SONG_NAME: "TrappedInThePast",
  // SONG_NAME: "MouIiKai",
  // SONG_NAME: "ThroughTheFireAndTheFlames_easy",
  // SONG_NAME: "ThroughTheFireAndTheFlames_hard",
  // SONG_NAME: "FreedomDive",
  // SONG_NAME: "HungarianDanceNo5",
  // SONG_NAME: "SleepingBeauty",
  COLUMN_KEYS: ["KeyA", "KeyS", "KeyK", "KeyL"],
  COLUMN_COLORS: ["green", "red", "blue", "yellow"],
  COLUMN_PERCENTAGES: ["20%", "40%", "60%", "80%"],
  HITCIRCLE_CENTER: Viewport.CANVAS_HEIGHT - 50,
  HITCIRCLE_RANGE: 70,
  USERPLAYED_CIRCLE_VISIBLE_EXTRA: 20,
  START_Y: "-15",
  PIXELS_PER_TICK: 4,
  NOTE_VOLUME_NORMALIZER: 10,
} as const;


type NoteType = Readonly<{
  userPlayed: boolean,
  instrument: string,
  velocity: number,
  pitch: number,
  start: number,
  end: number,
  duration: number,
}>

/**
 * Circle type
 */
type Circle = Readonly<{
  id: string,
  r: string,
  cx: string,
  cy: string,
  style: string,
  class: string,
  note: NoteType,
  circleClicked: boolean,
  tailHeight?: number,
  isHoldNote: boolean,
}>

type CircleLine = Readonly<{
  id: string,
  x1: string,
  x2: string,
  y1: string,
  y2: string,
  stroke: string,
  strokeWidth: string,
  opacity: string,
}>

/**
 * Game state
 */
type State = Readonly<{
  time: number,
  circleProps: ReadonlyArray<Circle>,
  bgCircleProps: ReadonlyArray<Circle>,
  tailProps: ReadonlyArray<CircleLine>,
  holdCircles: ReadonlyArray<Circle>,
  exit: ReadonlyArray<Circle>,
  exitTails: ReadonlyArray<CircleLine>,
  gameEnd: boolean,
  score: number,
  combo: number,
  highestCombo: number,
  n300: number,
  n100: number,
  n50: number,
  nmiss: number
}>

/**
 * Actions modify state
 */
interface Action {
  apply(s: State): State;
}
