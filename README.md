# Cinematic-Cameras-V2

## How to Use
1. Download the latest version from the [Releases](https://github.com/MajestikButter/Cinematic-Cameras-V2/releases) page.
2. Enable the `Beta APIs` and `Holiday Creator Features` experiments.
3. Apply the pack to your desired world.
4. Load into the world.
5. Create a new cinematic using [`!new`](#new-cinematicid-string-data-jsoncinematic) with the desired cinematic id.
6. Edit the cinematic using [`!edit`](#edit-cinematicid-string) with the desired cinematic id.
7. ***Optional***. You can run `/gamerule showtags false` to disable some of the annoying item text.

## Setting Up Keyframes
1. Navigate to the `New Keyframe` item in the editor hotbar and use it
    - A new keyframe should now be created with your rotation and position
3. Navigate to the `Edit Keyframe` item in the editor hotbar and use it
    - You can edit any settings related to this specific keyframe here
    - You may move the keyframe to a different time code by editing the time setting
    - Leaving all fields for position or rotation blank will make the keyframe be ignored for position and rotation related interpolation
    - You may specify a command to be ran when a keyframe is reached here

## Saving/Exporting Cinematics
1. Run [`!export`](#export-cinematicid-string) with the desired cinematicId.
2. Close the chat gui.
3. Wait for the `Copy Paste` form to appear.
4. Follow the directions on the form.
5. Once copied, you can paste this anywhere you'd like.


## Importing Cinematics
1. Navigate to the behavior pack directory.
2. Open the `/scripts` directory.
3. Open the `/cinematics.js` file in a text editor.
4. Paste the cinematic data into the object, with the key being the desired identifier for the cinematic.

## Using Autosave
Autosave is automatically enabled and saves the currently edited cinematic every 30 seconds.
You can load the autosave by running `!edit autosave`. This will load the last autosaved cinematic in the event that
your game exits or crashes while editing a cinematic.
Note that this only saves one cinematic at a time.


## Commands
#### `!new <cinematicId: string> [data: JSONCinematic]`
> Creates a new cinematic. Only saves for the current game session, make sure to use `!export`.

#### `!edit <cinematicId: string>`
> Opens the editor for the specified cinematic. Only saves for the current game session, make sure to use `!export` after you're done.

#### `!save <cinematicId: string>`
> Saves the cinematic that is currently being edited with a new cinematic id.

#### `!play <cinematicId: string> [start: number] [speed: number]`
> Plays the specified cinematic. 

#### `!stop`
> Stops playing the current cinematic.

#### `!visualize <cinematicId: string> [start: number] [speed: number]`
> Visualizes the path a cinematic takes using particles.

#### `!export <cinematicId: string>`
> Prompts the `Copy Paste` form with an object representation of the cinematic. Used to save cinematics in an editable state.

#### `!bake <cinematicId: string> [stepSpeed: number]`
> Prompts the `Copy Paste` form with an mcfunction version of the cinematic. Used to convert cinematics into a non-experimental state via commands.

Thanks to [this video](https://www.youtube.com/watch?v=jvPPXbo87ds) for the lesson on splines and providing the inspiration to tackle this project again.
