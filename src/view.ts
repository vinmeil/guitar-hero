import { Circle, CircleLine, State, Viewport } from "./types"
import { attr, getAccuracy, playNote } from "./util";

export { updateView }

/**
 * Update the SVG game view.  
 * 
 * @param onFinish a callback function to be applied when the game ends.  For example, to clean up subscriptions.
 * @param s the current game model State
 * @returns void
 */
const updateView = (onFinish: () => void) => {
  return function(s: State): void {
    const svg = document.querySelector("#svgCanvas") as SVGGraphicsElement &
    HTMLElement;

    const updateCircleView = (svg: HTMLElement) => (props: Circle | CircleLine) => {
      function createNewSVG() {
        const newSVGObject = document.createElementNS(svg.namespaceURI, "circle") as SVGElement;
        attr(newSVGObject, { ...props });
        return newSVGObject;
      }

      const curSVG = document.getElementById(props.id) || createNewSVG();
      attr(curSVG, { ...props });
    }

    // update view of circles and tails
    s.circleProps.forEach(updateCircleView(svg));
    s.tailProps.forEach(updateCircleView(svg));
    const scoreHTML = document.getElementById("scoreText");
    if (scoreHTML) {
      scoreHTML.textContent = `${s.score}`;
    }

    // update combo text
    const combo = document.getElementById("comboText");
    if (combo) {
      const comboDigits = s.combo.toString().length - 1;
      attr(combo, { x: `${96 - (6 * comboDigits)}`})
      combo.textContent = `${s.combo}`;
    }

    // update highest combo text
    const highestCombo = document.getElementById("highestComboText");
    if (highestCombo) {
      highestCombo.textContent = `${s.highestCombo}`;
    }

    // update accuracy text
    const accuracyText = document.getElementById("accuracyText");
    if (accuracyText) {
      const accuracy = getAccuracy(s);
      accuracyText.textContent = `${accuracy.toFixed(2)}%`;
    }

    // update tails
    s.exitTails.forEach(line => {
      const lineSVG = document.getElementById(line.id);
      if (lineSVG) {
        lineSVG.remove();
      }
    })

    // update circles
    s.exit
      .map((circle) => {
        if ( (!circle.isHoldNote && !circle.note.userPlayed ) || ( circle.circleClicked && !circle.isHoldNote ) ) {
          playNote(circle);
        }

        return circle;
      })
      .forEach(circle => {
        const circleSVG = document.getElementById(circle.id);
        if (circleSVG) {
          circleSVG.remove();
        }
      })


    if (s.gameEnd) {
      const gameOver = document.getElementById("gameOver");
      if (gameOver) {
        attr(gameOver, { visibility: "visible" });
      }
      onFinish();
    }
  }
}
