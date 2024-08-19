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

import { from, fromEvent, interval, merge, Observable, of, Subscription, timer } from "rxjs";
import { map, filter, scan, mergeMap, delay, takeUntil, take, switchMap, toArray, tap, mergeWith, last } from "rxjs/operators";
import * as Tone from "tone";
import { SampleLibrary } from "./tonejs-instruments";
import { CreateCircle, initialState, HitCircle, reduceState, Tick, KeyUpHold } from "./state";
import { Action, Circle, Constants, NoteType, State, Viewport } from "./types";
import { updateView } from "./view";
import { generateUniqueId, playNote, startNote, stopNote } from "./util";

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
export function main(csvContents: string, samples: { [key: string]: Tone.Sampler }) {
    // Canvas elements
    const svg = document.querySelector("#svgCanvas") as SVGGraphicsElement &
        HTMLElement;
    const preview = document.querySelector(
        "#svgPreview",
    ) as SVGGraphicsElement & HTMLElement;
    const gameover = document.querySelector("#gameOver") as SVGGraphicsElement &
        HTMLElement;
    const container = document.querySelector("#main") as HTMLElement;

    svg.setAttribute("height", `${Viewport.CANVAS_HEIGHT}`);
    svg.setAttribute("width", `${Viewport.CANVAS_WIDTH}`);

    // Text fields
    const multiplier = document.querySelector("#multiplierText") as HTMLElement;
    const scoreText = document.querySelector("#scoreText") as HTMLElement;
    const highScoreText = document.querySelector(
        "#highScoreText",
    ) as HTMLElement;

    /** User input */

    const key$ = (e: Event, k: Key) =>
      fromEvent<KeyboardEvent>(document, e)
        .pipe(
          filter(({ code }) => code === k),
          filter(({ repeat }) => !repeat))

    // const key$ = fromEvent<KeyboardEvent>(document, "keypress");

    // const fromKey = (keyCode: Key) =>
    //     key$.pipe(filter(({ code }) => code === keyCode));

    /** Determines the rate of time steps */
    const tick$ = interval(Constants.TICK_RATE_MS);
    
    // gets the column that the circle should go to
    // const getColumn = (pitch: number, minPitch: number, maxPitch: number): number => {
      // const range = maxPitch - minPitch + 1; // finds range of pitch
      // const cur = pitch - minPitch;
      // const ratio = cur / range;
      // return Math.floor(ratio * 4); // return column based on quartile of the current pitch

    //   const range = maxPitch - minPitch + 1; // finds range of pitch
    //   const randomPitch = Math.floor(Math.random() * range) + minPitch; // generate random pitch within range
    //   const cur = randomPitch - minPitch;
    //   const ratio = cur / range;
    //   return Math.floor(ratio * 4);
    // }

    // const lastAssignedColumn: { [startTime: number]: number } = {};

    // function getColumn(startTime: number, pitch: number): number {
    //   const columns = [0, 1, 2, 3]; // Assuming 4 columns
    //   if (lastAssignedColumn[startTime] !== undefined) {
    //     // Remove the last assigned column from the available columns
    //     const lastColumn = lastAssignedColumn[startTime];
    //     const availableColumns = columns.filter(col => col !== lastColumn);
    //     // Assign a new column from the available columns
    //     const newColumn = availableColumns[Math.floor(Math.random() * availableColumns.length)];
    //     lastAssignedColumn[startTime] = newColumn;
    //     return newColumn;
    //   } else {
    //     // If no column was assigned for this start time, assign a random column
    //     const newColumn = columns[Math.floor(Math.random() * columns.length)];
    //     lastAssignedColumn[startTime] = newColumn;
    //     return newColumn;
    //   }
    // }

    // FIXME: using mutable variables, change to immutable. this is just so i can play the songs nicely
    let prev = [0, 0, 0, 0];
    function getColumn(startTime: number, pitch: number, userPlayed: boolean): number {
      const columns = [0, 1, 2, 3]; // Assuming 4 columns
      const modifier = [-1, 1]
      const currentTime = startTime; // Assuming startTime is in milliseconds
      const randomIndex = Math.floor(Math.random() * modifier.length);
      
      let counter = 3;
      let newColumn = columns[Math.floor(Math.random() * columns.length)];
      while (Math.abs(prev[newColumn] - currentTime) <= 0.150 && counter > 0) {
        newColumn += modifier[randomIndex] + 4;
        newColumn %= 4;
        counter--;
      }

      if (userPlayed) {
        prev[newColumn] = currentTime
      }

      return newColumn;
    }
    
    const columnColors = ["green", "red", "blue", "yellow"]
    
    // process csv
    const values: string[] = csvContents.split("\n").slice(1).filter(Boolean);
    
    // get min and max pitch
    const pitches: number[] = values.map((line) => Number(line.split(",")[3]));
    const minPitch = Math.min(...pitches);
    const maxPitch = Math.max(...pitches);
    
    // turn everything to objects so its easier
    const notes: NoteType[] = values.map((line) => {
      const splitLine = line.split(",");
      return {
        userPlayed: splitLine[0].toLowerCase() === "true",
        instrument: splitLine[1],
        velocity: Number(splitLine[2]),
        pitch: Number(splitLine[3]),
        start: Number(splitLine[4]),
        end: Number(splitLine[5]),
        duration: Number(splitLine[5]) - Number(splitLine[4]),
      } as const
    })
    
    const gameClock$ = tick$.pipe(map(elapsed => new Tick(elapsed)));
    const colOneKeyDown$ = key$("keydown", "KeyA").pipe(map(_ => new HitCircle("KeyA")));
    const colTwoKeyDown$ = key$("keydown", "KeyS").pipe(map(_ => new HitCircle("KeyS")));
    const colThreeKeyDown$ = key$("keydown", "KeyK").pipe(map(_ => new HitCircle("KeyK")));
    const colFourKeyDown$ = key$("keydown", "KeyL").pipe(map(_ => new HitCircle("KeyL")));

    // const colOneKeyUp$ = key$("keyup", "KeyA").pipe(map(_ => new KeyUpHold("KeyA")));
    // const colTwoKeyUp$ = key$("keyup", "KeyS").pipe(map(_ => new KeyUpHold("KeyS")));
    // const colThreeKeyUp$ = key$("keyup", "KeyK").pipe(map(_ => new KeyUpHold("KeyK")));
    // const colFourKeyUp$ = key$("keyup", "KeyL").pipe(map(_ => new KeyUpHold("KeyL")));

    const circleStream$ = from(notes).pipe(
      mergeMap(note => of(note).pipe(delay(note.start * 1000))),
      map(note => {
        // const column = getColumn(note.start, note.pitch);
        const column = getColumn(note.start, note.pitch, note.userPlayed);
        return new CreateCircle({
          id: generateUniqueId(),
          r: `${Note.RADIUS}`,
          cx: `${((column + 1) * 20)}%`, // taken from examples above
          cy: Constants.START_Y,
          style: `fill: ${columnColors[column]}`,
          class: "shadow",
          note: note,
          circleClicked: false,
          isHoldNote: note.end - note.start >= 1 && note.userPlayed ? true : false,
          tailHeight: ( 1000 / Constants.TICK_RATE_MS ) * Constants.PIXELS_PER_TICK * (note.end - note.start) - 50,
        })
      }),
    )

    // TODO: change any to the correct type

    const action$ = merge(
      gameClock$,
      colOneKeyDown$,
      colTwoKeyDown$,
      colThreeKeyDown$,
      colFourKeyDown$,
      circleStream$
    );

    const state$ = timer(3000).pipe( // add a 3 second delay to allow the instruments to load
      mergeMap(() => action$),
      scan(reduceState, initialState),
    );

    const subscription: Subscription = state$.subscribe(s => {
      // play non hold notes on keydown
      s.exit.forEach(obj => {
        if (obj.circleClicked && !obj.isHoldNote) {
          playNote(obj);
        }
      })

      // play hold notes on keydown and stop on keyup
      s.holdCircles.forEach(circle => {
        if (!circle.circleClicked || !circle.isHoldNote) {
          return circle;
        }

        Tone.ToneAudioBuffer.loaded().then(() => {
          if ( !samples[circle.note.instrument] ||
               Number(circle.cy) >= Constants.HITCIRCLE_CENTER + Constants.USERPLAYED_CIRCLE_VISIBLE_EXTRA ) {
            return circle;
          }
          
          const duration$ = of(circle).pipe(delay(circle.note.duration * 1000));
          const keyup$ = fromEvent<KeyboardEvent>(document, 'keyup')
          .pipe( filter(event => {
            const keyIndex = Constants.COLUMN_KEYS.indexOf(event.code as "KeyA" | "KeyS" | "KeyK" | "KeyL");
            return keyIndex !== -1 && Constants.COLUMN_PERCENTAGES[keyIndex] === circle.cx;
          }));

          const start$ = of(circle).pipe(delay(0), take(1));
          const stop$ = merge(keyup$, duration$);

          start$.subscribe(() => {
            startNote(circle);
          });

          stop$.subscribe(() => {
            stopNote(circle);
          });
        });
      })

      updateView(() => subscription.unsubscribe())(s)
    });
    

    }

    // The following simply runs your main function on window load.  Make sure to leave it in place.
    // You should not need to change this, beware if you are.
    if (typeof window !== "undefined") {
      // Load in the instruments and then start your game!
    const samples = SampleLibrary.load({
        instruments: [
            "bass-electric",
            "violin",
            "piano",
            "trumpet",
            "saxophone",
            "trombone",
            "flute",
        ], // SampleLibrary.list,
        baseUrl: "samples/",
    });

    const startGame = (contents: string) => {
        document.body.addEventListener(
            "mousedown",
            function () {
                main(contents, samples);
            },
            { once: true },
        );
    };

    const { protocol, hostname, port } = new URL(import.meta.url);
    const baseUrl = `${protocol}//${hostname}${port ? `:${port}` : ""}`;

    Tone.ToneAudioBuffer.loaded().then(() => {
        for (const instrument in samples) {
            samples[instrument].toDestination();
            samples[instrument].release = 0.5;
        }

        fetch(`${baseUrl}/assets/${Constants.SONG_NAME}.csv`)
            .then((response) => response.text())
            .then((text) => startGame(text))
            .catch((error) =>
                console.error("Error fetching the CSV file:", error),
            );
    });
}
