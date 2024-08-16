
export type { Circle, ObjectId, State, Action };
export { Constants, Viewport };

const Viewport = {
  CANVAS_WIDTH: 200,
  CANVAS_HEIGHT: 400,
} as const;

const Constants = {
  TICK_RATE_MS: 6,
  // SONG_NAME: "RockinRobin",
  // SONG_NAME: "ComparedChild",
  // SONG_NAME: "BusToAnotherWorld",
  // SONG_NAME: "UnderKids",
  // SONG_NAME: "RainingAfterAll",
  // SONG_NAME: "LowAsDirt",
  SONG_NAME: "TrappedInThePast",
  // SONG_NAME: "MouIiKai",
  // SONG_NAME: "FreedomDive",
  // SONG_NAME: "HungarianDanceNo5",
  // SONG_NAME: "SleepingBeauty",
  COLUMN_KEYS: ["KeyA", "KeyS", "KeyK", "KeyL"],
  HITCIRCLE_CENTER: Viewport.CANVAS_HEIGHT - 50,
  HITCIRCLE_RANGE: 70,
  USERPLAYED_CIRCLE_VISIBLE_EXTRA: 20,
  START_Y: "-15",
} as const;

/**
 * ObjectIds help us identify objects and manage objects which timeout (such as bullets)
 */
type ObjectId = Readonly<{ id: string }>

/**
 * Circle type
 */
type Circle = Readonly<{
  duration: number,
  velocity: number,
  instrument: string,
  pitch: number,
  userPlayed: boolean,
  circleClicked: boolean,
  id: string,
  r: string,
  cx: string,
  cy: string,
  style: string,
  class: string,
}>

/**
 * Game state
 */
type State = Readonly<{
  time: number,
  circleProps: ReadonlyArray<Circle>,
  circleSVGs: ReadonlyArray<SVGElement>,
  exit: ReadonlyArray<Circle>,
  gameEnd: boolean,
  score: number,
}>

/**
 * Actions modify state
 */
interface Action {
  apply(s: State): State;
}
