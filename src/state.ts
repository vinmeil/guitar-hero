import { Action, Circle, Constants, State, Viewport } from "./types";
import { attr } from "./util";

export { Tick, CreateCircle, reduceState, initialState };

class Tick implements Action {
  constructor(public readonly elapsed: number) { }
  /** 
   * @param s old State
   * @returns new State
   */
  apply(s: State): State {
      const expired = s.circleProps.map(Tick.moveBody).filter(circle => Number(circle.cy) > Viewport.CANVAS_HEIGHT - 50);
      const updatedCircleProps = s.circleProps.map(Tick.moveBody).filter(circle => Number(circle.cy) <= Viewport.CANVAS_HEIGHT - 50);
      const updatedCircleSVGs = s.circleSVGs.filter(svg => document.getElementById(svg.id));

      return {
          ...s,
          circleProps: updatedCircleProps,
          circleSVGs: updatedCircleSVGs.concat(updatedCircleProps.map(Tick.createCircleSVG).filter((svg) => svg !== undefined)),
          exit: expired,
          time: this.elapsed,
      };
  }

  static moveBody = (circle: Circle): Circle => ({
    ...circle,
    cy: `${parseInt(circle.cy) + 4}`,
  })

  static createCircleSVG = (circle: Circle): SVGElement | undefined => {
    if (!circle.user_played) {
      return undefined;
    }

    if (document.getElementById(circle.id)) {
      return undefined;
    }

    const svg = document.querySelector("#svgCanvas") as SVGGraphicsElement &
      HTMLElement;
    const newCircle = document.createElementNS(svg.namespaceURI, "circle") as SVGElement;
    attr(newCircle, { ...circle });
    svg.appendChild(newCircle);
    return newCircle;
  }
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
    };
  }
}

const initialState: State = {
  time: 0,
  circleProps: [],
  circleSVGs: [],
  exit: [],
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