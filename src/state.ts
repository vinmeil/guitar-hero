import { Action, Circle, State } from "./types";

export { Tick, CreateCircle, reduceState, initialState };

class Tick implements Action {
  constructor(public readonly elapsed: number) { }
  /** 
   * @param s old State
   * @returns new State
   */
  apply(s: State): State {
      return {
          ...s,
          circleProps: s.circleProps.map(Tick.moveBody),
          time: this.elapsed,
      };
  }

  static moveBody = (circle: Circle): Circle => ({
    ...circle,
    cy: `${parseInt(circle.cy) - 10}`,
  })

  
}

class CreateCircle implements Action {
  constructor(public readonly circle: Circle) { }

  /**
   * @param s old State
   * @returns new State
   */
  apply(s: State): State {
    return {
      ...s,
      circleProps: s.circleProps.concat(this.circle),
      objCount: s.objCount + 1,
    };
  }
}

const initialState: State = {
  time: 0,
  circleProps: [],
  circleSVGs: [],
  objCount: 0,
  gameEnd: false,
  score: 0,
};

/**
 * state transducer
 * @param s input State
 * @param action type of action to apply to the State
 * @returns a new State 
 */
const reduceState = (s: State, action: Action) => action.apply(s);