# Cinematic-Cameras-V2

## How to Use
1. Download the latest version from the [Releases](https://github.com/MajestikButter/Cinematic-Cameras-V2/releases) page.
2. Enable the `Beta APIs` and `Holiday Creator Features` experiments.
3. Apply the pack to your desired world.
4. Load into the world.
5. Create a new cinematic using `!new` with the desired cinematic id.
6. Edit the cinematic using `!edit` with the desired cinematic id.


## Commands
`!new <cinematicid: string> [data: JSONCinematic]`
> Creates a new cinematic. Only saves for the current game session, make sure to use `!export`.

`!edit <cinematicid: string>`
> Opens the editor for the specified cinematic. Only saves for the current game session, make sure to use `!export` after your done.

`!play <cinematicid: string> [start: number] [speed: number]`
> Plays the specified cinematic. 

`!stop`
> Stops playing the current cinematic.

`!visualize <cinematicid: string> [start: number] [speed: number]`
> Visualizes the path a cinematic takes using particles.

`!export <cinematicid: string>`
> Prompts the `Copy Paste` form with an object representation of the cinematic. Used to save cinematics in an editable state.

`!bake <cinematicid: string> [stepSpeed: number]`
> Prompts the `Copy Paste` form with an mcfunction version of the cinematic. Used to convert cinematics into a non-experimental state via commands.

## Saving/Exporting Cinematics
1. Run `!export` with the desired cinematicId.
2. Close the chat gui.
3. Wait for the `Copy Paste` form to appear.
4. Follow the directions on the form.
5. Once copied, you can paste this anywhere you'd like.

## Importing Cinematics
1. Navigate to the behavior pack directory.
2. Open the `/scripts` directory.
3. Open the `/cinematics.js` file in a text editor.
4. Paste the cinematic data into the object, with the key being the desired identifier for the cinematic.

Thanks to [this video](https://www.youtube.com/watch?v=jvPPXbo87ds) for the lesson on splines and providing the inspiration to tackle this project again.