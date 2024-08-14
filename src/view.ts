import { State } from "./types"

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

    
  }
}
