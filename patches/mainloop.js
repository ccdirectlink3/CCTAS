// patch the main loop to use custom timer and inputs
// also add features like frame advance

import * as keys from '../utils/keys.js';
import Notifier from '../utils/notifier.js';
import * as reload from '../utils/reload.js';

import * as inputs from '../patches/inputs.js';
import * as time from '../patches/time.js';


//
// patch main loop
//

const run = "ya";
const Timer = "ml";
const timerTick = "ja";
const systemTimer = "j_a";
const systemTick = "jz";
const systemTickPause = "Sa";
const systemTickScale = "ja";
const isPaused = "dea";
const gameTimeScale = "gm";
const fastForward = "Wn";
const sound = "le";
const offsetTime = "ova";

const MAX_UPDATE_TIME = 1/20;

export var framesPerUpdate = 0;
export var pauseOnFrame = 0;
var framesToRun = 0;

export function setFramesPerUpdate(count) {
    var delta = count - framesPerUpdate;
    framesPerUpdate = count;
    framesToRun = Math.max(0, framesToRun+delta);
}
export function pauseOn(frame) {
    pauseOnFrame = frame;
}
export function pause(offset=0) {
    pauseOnFrame = time.frames()+offset;
}
export function unpause() {
    pauseOnFrame = Infinity;
}

export var preUpdate = new Notifier();
export var postFrame = new Notifier();
export var postUpdate = new Notifier();

function update() {
    try {
        var start = time.now();
        
        inputs.pollGamepads();
        
        preUpdate.fire();
        
        if(ig.ready && framesPerUpdate > 0) {
            framesToRun += framesPerUpdate;
        }
        
        while(ig.ready && framesToRun > 0 && time.frames() < pauseOnFrame ) {
            framesToRun -= 1;

            checkGlobalState();
            
            inputs.inject();
            
            // update time
            time.step();
            ig.system[systemTick] = ig.system[systemTimer][timerTick]();
            ig.system[systemTickPause] = ig.system[isPaused]() ? 0 : ig.system[systemTick];
            ig.system[systemTickScale] = ig.system[systemTickPause] * ig.system[gameTimeScale];
            if(ig.system[fastForward]) {
                ig.system[systemTickPause] *= 8;
                ig.system[systemTickScale] *= 8;
            }
            // supposedly this could be non-zero, but im not sure what circumstances that would actually happen in
            // perhaps when sound is paused, but when the sound is resumed it will get set back to 0 anyway
            // if sound is ever patched then this will probably be obsolete or make more sense
            ig[sound].context[offsetTime] = 0;
            
            // handle pressing the reload button
            // this is done after time.step() to mark that this frame is already done
            // and before any game logic to be conservative with adding features to the game
            if(inputs.game.isPrevDown(keys.RELOAD)) {
                reload.reload();
            }
            
            // update the game
            // this ends up drawing multiple times when fastforwarding...
            ig.system.delegate[run]();
            
            postFrame.fire();
            
            if(!ig.ready || (time.now() - start) > MAX_UPDATE_TIME) {
                framesToRun = 0;
                break;
            }
        }
        
        postUpdate.fire();
        
        inputs.user.update();
        inputs.user.release(keys.WHEEL_X);
        inputs.user.release(keys.WHEEL_Y);
        
        window.requestAnimationFrame(update);
    } catch(e) {
        ig.system.error(e);
    }
}

// TODO this does not intercept on the same frame every time
// so the first thing that any TAS would need to do is skip the intro to resync it
// and hopefully loading mods is never so slow that the intro advances on its own before interception
ig.system[run] = function() {
    // on first intercepted frame we need to reset last time, which is normally done by timerTick
    // though I'm not sure why the intro gets stuck...
    ig.system[systemTimer].last = time.gameNow();
    
    update();
}


// TODO find more globals
function checkGlobalState() {
    if(1 !== ig.system.Azb) throw new Error("frame skip was modified");
    if(60 !== ig.system.Zoa) throw new Error("frame rate was modified");
    if(1 !== ig[Timer].N8) throw new Error("global time scale was modified");
    if(1 !== ig.system.Ddb) throw new Error("game time scale was modified");
    if(null !== ig.system.Nra) throw new Error("game class was modified");
    if(expectedDelegate !== ig.system.delegate) throw new Error("game object was modified");
}
var expectedDelegate = ig.system.delegate;
if(0 !== ig.system.Z4a) throw new Error("initialization did not use requestAnimationFrame");
