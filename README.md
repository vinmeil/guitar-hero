# Guitar Hero

## Overview

This project is a rhythm game developed as a side project to learn about RxJS and observables. The game uses functional reactive programming (FRP) principles and is built with TypeScript, RxJS, and Tone.js while also following the Model-View-Controller (MVC) architecture. Players can select a song and interact with the game by hitting keys in sync with the music.

## Features

- **Song Selection**: Choose from a list of preloaded songs.
- **Interactive Gameplay**: Hit the correct keys in time with the music.
- **Visual Feedback**: Animated circles and tails representing notes.
- **Score Tracking**: Keep track of your score, combo, and highest combo.

## Installation

To set up the project locally, follow these steps:

1. **Clone the repository**:

   ```sh
   git clone <repository-url>
   cd <repository-directory>
   ```

2. **Install dependencies**:

   ```sh
   npm install
   ```

3. **Run the development server**:

   ```sh
   npm run dev
   ```

4. **Build the project**:

   ```sh
   npm run build
   ```

5. **Run tests**:
   ```sh
   npm run test
   ```

## Usage

1. **Start the development server**:

   ```sh
   npm run dev
   ```

2. **Open the game in your browser**:
   Navigate to `http://localhost:3000` (or the port specified by Vite).

3. **Select a song**:

   - Click on a song from the list to start playing.

4. **Play the game**:
   - Use the keys `A`, `S`, `K`, and `L` to hit the notes as they reach the hit circle.

## Key Files

- **`src/main.ts`**: Main entry point for the game logic.
- **`src/types.ts`**: Type definitions and constants.
- **`src/state.ts`**: State management and reducers.
- **`src/view.ts`**: Functions for updating the view.
- **`src/util.ts`**: Utility functions.

## Technologies Used

- **TypeScript**: For type-safe JavaScript.
- **RxJS**: For functional reactive programming.
- **Tone.js**: For handling audio playback.
- **Vite**: For fast development and build tooling.

## Contributing

Contributions are welcome! Please follow these steps to contribute:

1. **Fork the repository**.
2. **Create a new branch**:
   ```sh
   git checkout -b feature/your-feature-name
   ```
3. **Make your changes**.
4. **Commit your changes**:
   ```sh
   git commit -m 'Add some feature'
   ```
5. **Push to the branch**:
   ```sh
   git push origin feature/your-feature-name
   ```
6. **Open a pull request**.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Acknowledgements

- **FRP Asteroids**: [Asteroids in FRP](https://tgdwyer.github.io/asteroids/)
- **Tone.js**: [Tone.js Documentation](https://tonejs.github.io/)

## Contact

For any questions or feedback, please contact Vincent Liem at vincent.wesley.liem@gmail.com.
