import * as reload from '../utils/reload.js';

//
// patch how timers work
//

const FPS = 60;

let didFirstFrame = false;
let frameCount = 0;

export function framesToSeconds(frames_) {
    return frames_ / FPS;
}

export function frames() {
    return frameCount;
}

export function setFrames(frames_) {
    frameCount = frames_;
    ig.Timer.time = framesToSeconds(frames_);
}

// not replacing ig.Timer.step
// since the game runs a single frame between patching and intercepting
export function step() {
    if(!didFirstFrame) {
        didFirstFrame = true;
        firstFrameFix();
    }
    setFrames(frameCount + 1);
}

// this needs to wait until the first intercepted frame
// since the game will run a single frame between patching and intercepting
function firstFrameFix() {
    // thankfully there is only a single timer instance during the intro
    const time = frameCount / FPS;
    ig.Timer.time = time;
    ig.system.clock.last = time;
}

// the current game time measured in seconds
// the actual value is not meaningful except when comparing to another time returned by this function
export function gameNow() {
    return ig.Timer.time;
}

// the current time measured in seconds
// the actual value is not meaningful except when comparing to another time returned by this function
export function now() {
    return performance.now() / 1000;
}


//
// patch the single event step that uses Date instead of Timer
// which is also only used for Jet's tutorial on the M.S. Solar
//

ig.EVENT_STEP.SET_VAR_TIME.prototype.start = function start() {
    const v = ig.Event.getVarName(this.varName);
    if(v) {
        ig.vars.set(v, gameNow() * 1000);
    } else {
        ig.log('SET_VAR_TIME: Variable Name is not a String!');
    }
};


//
// recover state from reload
//

// just set frameCount in deserialize, the next call to step() will set game time (to handle firstFrameFix)
reload.serde('frame', frames, (f) => {
    frameCount = f;
    didFirstFrame = false;
});
