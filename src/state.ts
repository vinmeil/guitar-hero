import { SampleLibrary } from "./tonejs-instruments";
import { Action, Circle, CircleLine, Constants, State, Viewport } from "./types";
import { attr, generateUniqueId, playNote } from "./util";
import * as Tone from "tone";

export { Tick, CreateCircle, reduceState, initialState, HitCircle, KeyUpHold };

const samples = SampleLibrary.load({
  instruments: SampleLibrary.list,
  baseUrl: "samples/",
});

class Tick implements Action {
  constructor(public readonly elapsed: number) { }
  /** 
   * @param s old State
   * @returns new State
   */
  apply(s: State): State {
      const expiredCircles = s.circleProps
        .map(Tick.moveCircle)
          // userPlayed and !userPlayed have different timings to allow for user played circles
          // to go past the bottom circles if not clicked, similar to other rhythm games
        .filter(circle =>
          ( Number(circle.cy) > Constants.HITCIRCLE_CENTER && !circle.userPlayed ) ||
          ( Number(circle.cy) > Constants.HITCIRCLE_CENTER + Constants.USERPLAYED_CIRCLE_VISIBLE_EXTRA && circle.userPlayed ) ||
          circle.circleClicked
        );

      const expiredTails = s.tailProps
        .map(Tick.moveTail)
        .filter(tail => parseInt(tail.y1) >= Constants.HITCIRCLE_CENTER);

      const missed = expiredCircles.filter(circle =>
        !circle.circleClicked && circle.userPlayed
      );

      const updatedCircleProps = s.circleProps
      .map(Tick.moveCircle)
      .filter(circle =>
        ( Number(circle.cy) <= Constants.HITCIRCLE_CENTER && !circle.userPlayed ) || 
        ( Number(circle.cy) <= Constants.HITCIRCLE_CENTER + Constants.USERPLAYED_CIRCLE_VISIBLE_EXTRA && circle.userPlayed )
      );
        
      const updatedHoldCircles = s.holdCircles
        .map(Tick.moveCircle)
        .filter(circle =>
          ( Number(circle.cy) <= Constants.HITCIRCLE_CENTER + // add length of tail
                                  ( (1000 / Constants.TICK_RATE_MS) *
                                  Constants.PIXELS_PER_TICK * circle.duration ) &&
            circle.isHoldNote)
        )
        
      const updatedTailProps = s.tailProps
        .map(Tick.moveTail)
        .filter(tail => parseInt(tail.y1) < Constants.HITCIRCLE_CENTER);

      return {
          ...s,
          circleProps: updatedCircleProps,
          tailProps: updatedTailProps,
          holdCircles: updatedHoldCircles,
          combo: missed.length === 0 ? s.combo : 0,
          exit: expiredCircles,
          exitTails: expiredTails,
          time: this.elapsed,
      };
  }

  static moveCircle = (circle: Circle): Circle => ({
    ...circle,
    cy: `${parseInt(circle.cy) + Constants.PIXELS_PER_TICK}`,
  })

  static moveTail = (tail: CircleLine): CircleLine => ({
    ...tail,
    y1: `${ parseInt(tail.y1) + Constants.PIXELS_PER_TICK }`,
    y2: `${Math.min( parseInt(tail.y2) + Constants.PIXELS_PER_TICK, Constants.HITCIRCLE_CENTER )}`,
  })
}


class KeyUpHold implements Action {
  constructor(public readonly key: string, private samples: { [key: string]: Tone.Sampler }) { }

  /**
   * @param s old State
   * @returns new State
   */
  apply(s: State): State {
    return {
      ...s,
    };
  }
}

class HitCircle implements Action {
  constructor(public readonly key: string) { }

  /**
   * @param s old State
   * @returns new State
   */
  apply(s: State): State {
    const col = Constants.COLUMN_KEYS.indexOf(this.key as "KeyA" | "KeyS" | "KeyK" | "KeyL");

    // find circles in hittable range
    const hittableCircles = s.circleProps
      .filter(circle => {
        const cy = Number(circle.cy);
        return cy >= Constants.HITCIRCLE_CENTER - Constants.HITCIRCLE_RANGE &&
              cy <= Constants.HITCIRCLE_CENTER + Constants.HITCIRCLE_RANGE &&
              circle.cx == `${(col + 1) * 20}%` &&
              circle.userPlayed;
      })

    if (hittableCircles.length === 0) {
      return s;
    }
    // find circle at lowest point in hittable range
    const circleToRemove = hittableCircles.reduce((max, circle) => Number(circle.cy) > Number(max.cy) ? circle : max, hittableCircles[0]);

    // new states
    const updatedCircleProps = s.circleProps.filter(circle => circle.id !== circleToRemove.id);
    const filteredHoldCircles = s.holdCircles.filter(circle => circle.id !== circleToRemove.id);
    const newCircle = { ...circleToRemove, circleClicked: true };

    return {
      ...s,
      circleProps: updatedCircleProps,
      exit: s.exit.concat(newCircle),
      holdCircles: filteredHoldCircles.concat(newCircle),
      combo: s.combo + 1,
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
    const tail = CreateCircle.createCircleSVG(this.circle);

    return {
      ...s,
      circleProps: s.circleProps.concat(this.circle),
      tailProps: tail ? s.tailProps.concat(tail) : s.tailProps,
      holdCircles: this.circle.isHoldNote && this.circle.userPlayed ? s.holdCircles.concat(this.circle) : s.holdCircles,
    };
  }

  static createCircleSVG = (circle: Circle): CircleLine | undefined => {
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

    if (!circle.isHoldNote) {
      return undefined;
    }

    if (circle.isHoldNote && circle.tailHeight) {
      const tailProps = {
        id: generateUniqueId(),
        x1: circle.cx,
        x2: circle.cx,
        y1: `-${circle.tailHeight}`,
        y2: circle.cy,
        stroke: Constants.COLUMN_COLORS[Constants.COLUMN_PERCENTAGES.indexOf(circle.cx as "20%" | "40%" | "60%" | "80%")],
        strokeWidth: "15",
        opacity: "1",
      }
      const tail = document.createElementNS(svg.namespaceURI, "line") as SVGElement;
      attr(tail, { ...tailProps, "stroke-width": tailProps.strokeWidth });
      svg.appendChild(tail);
      return tailProps;
    }
  }
}

const initialState: State = {
  time: 0,
  circleProps: [],
  tailProps: [],
  holdCircles: [],
  exit: [],
  exitTails: [],
  gameEnd: false,
  score: 0,
  combo: 0,
};

/**
 * state transducer
 * @param s input State
 * @param action type of action to apply to the State
 * @returns a new State 
 */
const reduceState = (s: State, action: Action) => action.apply(s);