import { Circle, CircleLine, Constants, State } from "./types";
import {
  attr,
  getAccuracy,
  isNotNullOrUndefined,
  playNote,
  releaseNote,
} from "./util";

export { updateView };

/**
 * Update the SVG game view.
 *
 * @param onFinish a callback function to be applied when the game ends.  For example, to clean up subscriptions.
 * @param s the current game model State
 * @returns void
 */
const updateView = (onFinish: () => void) => {
  return function (s: State): void {
    // get all the HTML elements from the DOM
    const svg = document.querySelector("#svgCanvas") as SVGGraphicsElement &
        HTMLElement,
      scoreText = document.getElementById("scoreText") as SVGGraphicsElement &
        HTMLElement,
      comboText = document.getElementById("comboText") as SVGGraphicsElement &
        HTMLElement,
      highestComboText = document.getElementById(
        "highestComboText",
      ) as SVGGraphicsElement & HTMLElement,
      accuracyText = document.getElementById(
        "accuracyText",
      ) as SVGGraphicsElement & HTMLElement,
      multiplierText = document.getElementById(
        "multiplierText",
      ) as SVGGraphicsElement & HTMLElement;

    // this function updates the views/positions of the circles and the tails on the SVG
    const updateSVGView =
      <T extends SVGElement>(svg: HTMLElement) =>
      (type: "circle" | "line") =>
      (props: Circle | CircleLine) => {
        function createNewSVG(): T {
          const newSVGObject = document.createElementNS(
            svg.namespaceURI,
            type,
          ) as T;
          attr(newSVGObject, { ...props, "stroke-width": props.strokeWidth });
          svg.appendChild(newSVGObject);
          return newSVGObject;
        }

        const curSVG = document.getElementById(props.id) || createNewSVG();
        attr(curSVG, { ...props, "stroke-width": props.strokeWidth });
      };

    // update view of circles and tails
    const update = updateSVGView(svg);
    s.circleProps.forEach(update("circle"));
    s.tailProps.forEach(update("line"));

    // update all texts on screen
    const comboDigits = s.combo.toString().length - 1;
    attr(comboText, { x: `${96 - 6 * comboDigits}` });

    const accuracy = getAccuracy(s);
    const accuracyDigits = accuracy.toFixed(2).length - 1;
    attr(accuracyText, { x: `${77 + 4 * (5 - accuracyDigits)}` });

    scoreText.textContent = `${s.score}`;
    comboText.textContent = `${s.combo}`;
    highestComboText.textContent = `${s.highestCombo}`;
    accuracyText.textContent = `${accuracy.toFixed(2)}%`;
    multiplierText.textContent = `${s.multiplier}x`;

    // remove tails that have exited the screen
    s.exitTails
      .map((line) => document.getElementById(line.id))
      .filter(isNotNullOrUndefined)
      .forEach((line) => svg.removeChild(line));

    // play audio for circles that have exited the screen
    s.exit
      // play note if circle is not userPlayed (bg audio) or if circle is clicked
      .filter((circle) => !circle.note.userPlayed || circle.circleClicked)
      .map(playNote);

    // remove circles that have exited the screen
    s.exit
      .map((circle) => document.getElementById(circle.id))
      .filter(isNotNullOrUndefined)
      .forEach((circle) => svg.removeChild(circle));

    // remove hold circles if the tail has reached the end of the duration
    s.holdCircles
      // check if the circle is either not being held down or
      // if the circle has reached the end of its duration (using y coordinate)
      .filter(
        (circle) =>
          !circle.circleClicked ||
          Number(circle.cy) >=
            Constants.HITCIRCLE_CENTER + // add length of tail
              (1000 / Constants.TICK_RATE_MS) *
                Constants.PIXELS_PER_TICK *
                circle.note.duration,
      )
      .forEach(releaseNote);

    // if game is over -> last note duration has passed, show game over screen
    if (s.gameEnd) {
      const gameOver = document.getElementById(
        "gameOver",
      ) as SVGGraphicsElement & HTMLElement;
      attr(gameOver, { visibility: "visible" });

      onFinish();
    }
  };
};
