/**
 * Inside this file you will use the classes and functions from rx.js
 * to add visuals to the svg element in index.html, animate them, and make them interactive.
 *
 * Study and complete the tasks in observable exercises first to get ideas.
 *
 * Course Notes showing Asteroids in FRP: https://tgdwyer.github.io/asteroids/
 *
 * You will be marked on your functional programming style
 * as well as the functionality that you implement.
 *
 * Document your code!
 */

import "./style.css";

import { BehaviorSubject, from, fromEvent, interval, merge, Observable, of, Subscription, timer } from "rxjs";
import { map, filter, scan, mergeMap, delay, tap } from "rxjs/operators";
import * as Tone from "tone";
import { SampleLibrary } from "./tonejs-instruments";
import { CreateCircle, initialState, HitCircle, reduceState, Tick, KeyUpHold } from "./state";
import { Constants, NoteType, State, Viewport } from "./types";
import { updateView } from "./view";
import { attr, processCsv, renderSongs } from "./util";

/** Use for song selection later on */
// move these to the top cause only functions get hoisted, variables dont
const { protocol, hostname, port } = new URL(import.meta.url);
const baseUrl = `${protocol}//${hostname}${port ? `:${port}` : ""}`;

/** Constants */

const Note = {
    RADIUS: 0.07 * Viewport.CANVAS_WIDTH,
    TAIL_WIDTH: 10,
};

/** User input */

type Key = "KeyA" | "KeyS" | "KeyK" | "KeyL";

type Event = "keydown" | "keyup" | "keypress";

/**
 * This is the function called on page load. Your main game loop
 * should be called here.
 */
export function main(samples: { [key: string]: Tone.Sampler }) {
    // Canvas elements
    const svg = document.querySelector("#svgCanvas") as SVGGraphicsElement &
        HTMLElement;

    svg.setAttribute("height", `${Viewport.CANVAS_HEIGHT}`);
    svg.setAttribute("width", `${Viewport.CANVAS_WIDTH}`);

    /** User input */

    const key$ = (e: Event, k: Key) =>
      fromEvent<KeyboardEvent>(document, e)
        .pipe(
          filter(({ code }) => code === k),
          filter(({ repeat }) => !repeat))

    // so we can map every song select div to a mouse down event
    const mapMouseDown = (element: HTMLElement): Observable<MouseEvent> => fromEvent<MouseEvent>(element, "mousedown");
    const songSelectDivs = document.querySelectorAll(".song")
    const songName$ = new BehaviorSubject<string>(""); // basically useState() in react

    // add mousedown event to every song select div
    songSelectDivs.forEach(div => {
      const mouseDown$ = mapMouseDown(div as HTMLElement);
      mouseDown$.subscribe(_ => {
        songName$.next(div.id); // set song name to the id of the div

        // hide the song select list and text after a song is selected
        const songSelectList = document.getElementById('song-select') as SVGGraphicsElement & HTMLElement;
        const pickSongText = document.getElementById('song-select-text') as SVGGraphicsElement & HTMLElement;
        songSelectList.style.display = "none";
        pickSongText.style.display = "none";
      })
    })

    /** fetches the csv contents using the song name as a param */
    const fetchCsvContents = async (songName: string): Promise<string> => {
      const res = await fetch(`${baseUrl}/assets/${songName}.csv`);
      return res.text();
    }

    // subscribe to songName$ so we can start the game when a song is selected
    songName$.pipe(
      // this simulates react's useEffect() kind of i guess where it waits for songName$ to change
      filter(songName => songName !== ""), // only start the game when a song is selected
      mergeMap<string, Observable<string>>(songName => from(fetchCsvContents(songName))),
    ).subscribe(csvContents => playGame(csvContents));

    /** main logic of the game, contains streams and how we handle the streams and its contents */
    const playGame = (csvContents: string) => {
        /** Determines the rate of time steps */
        const tick$ = interval(Constants.TICK_RATE_MS),
              timeFromTopToBottom = (Viewport.CANVAS_HEIGHT / Constants.PIXELS_PER_TICK * Constants.TICK_RATE_MS),
              values: ReadonlyArray<string> = csvContents.split("\n").slice(1).filter(Boolean), // remove first line and empty lines
              notes: ReadonlyArray<NoteType> = processCsv(values), // turn everything to objects so its easier to process
              seed: number = Date.now(); // get seed for RNG (impure but its outside of stream so its ok)
        
        const newInitialState: State = {
          ...initialState,
          lastNoteEndTime: (Math.max(...notes.map(note => note.end)) * 1000) + timeFromTopToBottom, // convert to ms then add by time it takes to travel from top to bottom of canvas
          randomNumber: seed,
        };
    
        // streams
        const gameClock$ = tick$.pipe(map(elapsed => new Tick(elapsed))),
              colOneKeyDown$ = key$("keydown", "KeyA").pipe(map(_ => new HitCircle("KeyA"))),
              colTwoKeyDown$ = key$("keydown", "KeyS").pipe(map(_ => new HitCircle("KeyS"))),
              colThreeKeyDown$ = key$("keydown", "KeyK").pipe(map(_ => new HitCircle("KeyK"))),
              colFourKeyDown$ = key$("keydown", "KeyL").pipe(map(_ => new HitCircle("KeyL"))),
              colOneKeyUp$ = key$("keyup", "KeyA").pipe(map(_ => new KeyUpHold("KeyA"))),
              colTwoKeyUp$ = key$("keyup", "KeyS").pipe(map(_ => new KeyUpHold("KeyS"))),
              colThreeKeyUp$ = key$("keyup", "KeyK").pipe(map(_ => new KeyUpHold("KeyK"))),
              colFourKeyUp$ = key$("keyup", "KeyL").pipe(map(_ => new KeyUpHold("KeyL")));
    
        const circleStream$ = from(notes).pipe(
          mergeMap(note => of(note).pipe(delay(note.start * 1000))),
          map(note => {
            return new CreateCircle({
              id: "0",
              r: `${Note.RADIUS}`,
              cx: `0%`, // taken from examples above
              cy: Constants.START_Y,
              style: `fill: green`,
              class: "shadow",
              note: note,
              circleClicked: false,
              isHoldNote: note.end - note.start >= 1 && note.userPlayed ? true : false,
              tailHeight: ( 1000 / Constants.TICK_RATE_MS ) * Constants.PIXELS_PER_TICK * (note.duration),
              audio: samples[note.instrument],
            })
          }),
        )
    
        // merge all actions so we can do some cool OOP polymorphism stuff with the reduceState
        const action$ = merge(
          gameClock$,
          colOneKeyDown$,
          colTwoKeyDown$,
          colThreeKeyDown$,
          colFourKeyDown$,
          colOneKeyUp$,
          colTwoKeyUp$,
          colThreeKeyUp$,
          colFourKeyUp$,
          circleStream$,
        );
    
        const state$ = timer(3000).pipe( // add a 3 second delay to allow the instruments to load
          mergeMap(() => action$),
          scan(reduceState, newInitialState),
        );
    
        const subscription: Subscription = state$.subscribe(updateView(() => subscription.unsubscribe()));
    }
}

  // The following simply runs your main function on window load.  Make sure to leave it in place.
  // You should not need to change this, beware if you are.
  if (typeof window !== "undefined") {
    // Load in the instruments and then start your game!
  const samples = SampleLibrary.load({
      instruments: [
          "bass-electric",
          "bassoon",
          "cello",
          "clarinet",
          "contrabass",
          "flute",
          "french-horn",
          "guitar-acoustic",
          "guitar-electric",
          "guitar-nylon",
          "harmonium",
          "harp",
          "organ",
          "piano",
          "saxophone",
          "trombone",
          "trumpet",
          "tuba",
          "violin",
          "xylophone",
      ], // SampleLibrary.list,
      baseUrl: "samples/",
  });

  const startGame = () => {
      renderSongs([...Constants.SONG_LIST]);
      // document.body.addEventListener(
      //     "mousedown",
      //     function () {
              main(samples);
          // },
      //     { once: true },
      // );
  };

  Tone.ToneAudioBuffer.loaded().then(() => {
      for (const instrument in samples) {
          samples[instrument].toDestination();
          samples[instrument].release = 0.5;
      }

      startGame();

      // fetch(`${baseUrl}/assets/${Constants.SONG_NAME}.csv`)
      //     .then((response) => response.text())
      //     .then((text) => startGame(text))
      //     .catch((error) =>
      //         console.error("Error fetching the CSV file:", error),
      //     );
  });
}
