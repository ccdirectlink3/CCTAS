// util to ease recovering state across reloading

// right now I am just dumping data to localStorage for simplicity
// but if that is ever an issue then it should be pretty simple to move to making a save file

const serializers = {};
const deserializers = {};

document.body.addEventListener('modsLoaded', () => {
    restartButton.addListener(() => {
        const state = {};
        for(const key in serializers) {
            state[key] = serializers[key]();
        }
        localStorage.tas = JSON.stringify(state);
    });
});

export function reload() {
    restartButton.restart(true);
}

export function recover() {
    if(localStorage.tas) {
        const state = JSON.parse(localStorage.tas);
        delete localStorage.tas;
        for(const key in deserializers) {
            deserializers[key](state[key]);
        }
        return true;
    } else {
        return false;
    }
}

export function serde(key, serializer, deserializer) {
    if(key in serializers) {
        throw new Error(`Reload key ${key} is already taken`);
    }
    serializers[key] = serializer;
    deserializers[key] = deserializer;
}
