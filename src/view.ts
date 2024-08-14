import { Circle, State, Viewport } from "./types"
import { attr } from "./util";

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

    console.log("updating body view")
    const updateBodyView = (svg: HTMLElement) => (circle: Circle) => {
      function createNewCircle() {
        const newCircle = document.createElementNS(svg.namespaceURI, "circle") as SVGElement;
        attr(newCircle, { ...circle });
        return newCircle;
      }

      const curCircle = document.getElementById(circle.id) || createNewCircle();
      attr(curCircle, { ...circle });
      if (Number(circle.cy) >= Viewport.CANVAS_HEIGHT - 5) {
        console.log("removed circle:", circle.cy)
        curCircle.remove()
      }
    }

    s.circleProps.forEach(updateBodyView(svg));
  }
}
