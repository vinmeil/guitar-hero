import { Action, Circle, Constants, State, Viewport } from "./types";
import { attr } from "./util";

export { Tick, CreateCircle, reduceState, initialState, HitCircle };

class Tick implements Action {
  constructor(public readonly elapsed: number) { }
  /** 
   * @param s old State
   * @returns new State
   */
  apply(s: State): State {
      const expired = s.circleProps.map(Tick.moveBody).filter(circle => (Number(circle.cy) > Viewport.CANVAS_HEIGHT - 30) || circle.circleClicked);
      const updatedCircleProps = s.circleProps.map(Tick.moveBody).filter(circle => (Number(circle.cy) <= Viewport.CANVAS_HEIGHT - 30));
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
    if (!circle.userPlayed) {
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

class HitCircle implements Action {
  constructor(public readonly key: string) { }

  /**
   * @param s old State
   * @returns new State
   */
  apply(s: State): State {
    const col = Constants.COLUMN_KEYS.indexOf(this.key as "KeyD" | "KeyF" | "KeyJ" | "KeyK");
    const hitCircleCenter = Viewport.CANVAS_HEIGHT - 40;
    // use +- 25px to account for the radius of the circle
    const hitCircleRange = 70;

    // find circles in hittable range
    const hittableCircles = s.circleProps.filter(circle => {
      const cy = Number(circle.cy);
      return cy >= hitCircleCenter - hitCircleRange && cy <= hitCircleCenter + hitCircleRange;
    }).filter(circle => {
      return circle.cx == `${(col + 1) * 20}%`;
    })

    if (hittableCircles.length === 0) {
      return s;
    }
    // find circle at lowest point in hittable range
    const circleToRemove = hittableCircles.reduce((max, circle) => Number(circle.cy) > Number(max.cy) ? circle : max, hittableCircles[0]);

    // new states
    const updatedCircleProps = s.circleProps.filter(circle => circle.id !== circleToRemove.id);
    const updatedCircleSVGProps = s.circleSVGs.filter(svg => svg.id !== circleToRemove.id);

    const newCircle = { ...circleToRemove, circleClicked: true };

    return {
      ...s,
      circleProps: updatedCircleProps,
      circleSVGs: updatedCircleSVGProps,
      exit: s.exit.concat(newCircle),
      score: s.score + 1,
    };
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