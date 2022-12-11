# Cinematic-Cameras-V2
 
## Commands
`!new <cinematicid: string>`
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
> Prints an object representation of the cinematic to content log. Used to save cinematics in an editable state.

`!bake <cinematicid: string> [stepSpeed: number]`
> Prints an mcfunction version of the cinematic to content log. Used to convert cinematics into a non-experimental state.

Thanks to [this video](https://www.youtube.com/watch?v=jvPPXbo87ds) for the lesson on splines and providing the inspiration to tackle this project again.