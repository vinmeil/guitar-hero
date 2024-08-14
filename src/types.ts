
export type { Circle, ObjectId, State, Action };

/**
 * ObjectIds help us identify objects and manage objects which timeout (such as bullets)
 */
type ObjectId = Readonly<{ id: string }>

/**
 * Circle type
 */
type Circle = Readonly<{
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
  objCount: number,
  gameEnd: boolean,
  score: number,
}>

/**
 * Actions modify state
 */
interface Action {
  apply(s: State): State;
}
