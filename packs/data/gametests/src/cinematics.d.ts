import { JSONTimeline } from './classes/Timeline';
import { CinematicType } from './enums/CinematicType';

declare const cinematics: {
  [id: string | number]: {
    posType: CinematicType;
    rotType: CinematicType;
    timeline: JSONTimeline
  };
};
export default cinematics;
