/**
 * How often we should beep
 */
var beepInterval;

const context = new (window.AudioContext || window.webkitAudioContext)();

/**
 * Low: The beep that is made on every beat but the main beat
 * High: The beep that is made on the first beat of the bar
 */
const frequencies = {
    low: 880.0,
    high: 1760.0
};

const elements = {
    noteTypes: document.getElementsByClassName("note-type"),
    beatTypes: document.getElementsByClassName("beat-type"),
    repeats: document.getElementsByClassName("repeat"),
    addButtons: document.getElementsByClassName("add-bar"),
    removeButtons: document.getElementsByClassName("remove-bar"),
    bars: document.getElementsByClassName("bar"),
    tempo: document.getElementById("tempo"),
    tempoValue: document.getElementById("tempo-value"),
    toggleButton: document.getElementById("toggle-button"),
    beatCounter: document.getElementById("beat-counter"),
    toggleOptions: document.getElementById("toggle-options"),
    closeOptions: document.getElementById("close-options"),
    options: document.getElementById("options"),
    volume: document.getElementById("volume"),
    waveform: document.getElementById("waveform"),
    tapButton: document.getElementById("tap-button")
};

/**
 * timesThrough: The amount of beeps made. This is counted so
 *               we can find out the first beat of the bar.
 * playSound: Whether or not we should be beeping
 */
const settings = {
    timesThrough: -1,
    playSound: false
};

elements.toggleButton.addEventListener('click', togglePlay);

elements.toggleOptions.addEventListener('click', function () {
    elements.options.classList.toggle('hidden');
});

elements.beatTypes[0].addEventListener('input', update);

// tempo: update display value while dragged and update beat when release
elements.tempo.addEventListener('input', updateTempoValue);
elements.tempo.addEventListener('change', update);

elements.closeOptions.addEventListener('click', (e) => {
    elements.options.classList.toggle('hidden');
});

elements.tapButton.addEventListener('click', updateTapTempo);

function addBarButtonEvents(startIndex) {
    var addIndex = 0;
    Array.from(elements.addButtons).forEach(function(button) {
        if (addIndex >= startIndex) {
            button.addEventListener('click', function() {
                addBar(Array.from(elements.addButtons).indexOf(button));
            });
        }
        addIndex++;
    });
    var removeIndex = 0;
    Array.from(elements.removeButtons).forEach(function(button) {
        if (removeIndex >= startIndex) {
            button.addEventListener('click', function() {
                removeBar(Array.from(elements.removeButtons).indexOf(button));
            });
        }
        removeIndex++;
    });
}

addBarButtonEvents(0);

function updateTempoValue() {
    elements.tempoValue.innerText = `${elements.tempo.value} bpm`;
}

function togglePlay() {
    settings.playSound = !settings.playSound;
    update(settings.playSound);
}

function updateBeatCounter() {
    const val = elements.noteTypes[0].value;
    elements.beatCounter.innerText = `${(settings.timesThrough % val) + 1}`;
}

function addBar(index) {
    var barsDiv = document.getElementById('bars');
    var noteType = elements.noteTypes[index].value;
    var beatType = elements.beatTypes[index].value;
    var repeat = elements.repeats[index].value;

    var originalBar = elements.bars[index];
    var newBar = originalBar.cloneNode(true);

    barsDiv.append(newBar);

    elements.noteTypes[elements.noteTypes.length-1].value = noteType;
    elements.beatTypes[elements.beatTypes.length-1].value = beatType;
    elements.repeats[elements.repeats.length-1].value = repeat;

    addBarButtonEvents(elements.bars.length-1);
    updateDisabled();
}

function removeBar(index) {
  if (!elements.removeButtons[index].classList.contains("disabled")) {
      var barsDiv = document.getElementById('bars');
      barsDiv.removeChild(elements.bars[index]);
      updateDisabled();
  }
}

function updateDisabled() {
    if (elements.removeButtons.length == 1) {
        Array.from(elements.removeButtons).forEach(function(button) {
            button.classList.add("disabled");
        });
        Array.from(elements.repeats).forEach(function(dropdown) {
            dropdown.value = "1";
            var att = document.createAttribute("disabled");
            dropdown.setAttributeNode(att)
        });
    }
    if (elements.removeButtons.length > 1 && elements.removeButtons[0].classList.contains("disabled")) {
        Array.from(elements.removeButtons).forEach(function(button) {
            button.classList.remove("disabled");
        });
        Array.from(elements.repeats).forEach(function(dropdown) {
            dropdown.removeAttribute("disabled");
        });
    }
}

/**
 * Updates the text of the button.
 * @param {Boolean} shouldPlaySound
 */
function updateToggleButtonText(shouldPlaySound) {
    let buttonText = "start";

    if (shouldPlaySound) {
        buttonText = "stop";
    }

    return buttonText;
}

function update(shouldPlaySound) {
    updateTempoValue();
    updateBeatCounter();
    elements.toggleButton.innerText = updateToggleButtonText(shouldPlaySound);
    clearInterval(beepInterval);

    if (shouldPlaySound) {
        // Tick once before starting the interval, to make the metronome
        // start immediately when pressing play.
        tick();
        return updateBeepInterval(elements.tempo.value, elements.beatTypes[0].value);
    }

    settings.timesThrough = -1;
}

var lastTap;
function updateTapTempo() {
	var tap = new Date();
	lastTap = lastTap || tap;
    var diffInMillis = Math.abs((lastTap - tap) / 1000);
	lastTap = tap;
    var bpm = 60 / diffInMillis;
    elements.tempo.value = bpm;
    tick();
    update();    
    updateTempoValue();
}


function updateBeepInterval(tempo, beatType) {

    if (tempo > 0) {
        const interval = parseInt(bpmToMs(tempo, beatType));
        beepInterval = setInterval(tick, interval);
    }
}

function bpmToMs(beatsPerMinute, beatType) {

    const noteDurations = {
        1: beatsPerMinute / 4,
        2: beatsPerMinute / 2,
        4: beatsPerMinute,
        8: beatsPerMinute * 2,
        16: beatsPerMinute * 4,
        32: beatsPerMinute * 8
    };

    const milliseconds = (60000 / noteDurations[beatType]);

    return milliseconds;
}

function shouldBeep (timesThrough, noteType) {
    return timesThrough % noteType === 0;
}

function tick() {
    settings.timesThrough++;
    updateBeatCounter();

    const oscillator = context.createOscillator();
    const gain = context.createGain();

    gain.gain.value = elements.volume.value;
    oscillator.type = elements.waveform.value;
    oscillator.frequency.value = frequencies.low;
    oscillator.connect(gain);

    gain.connect(context.destination);

    timeToBeep = shouldBeep(settings.timesThrough, elements.noteTypes[0].value)

    if (timeToBeep) {
        oscillator.frequency.value = frequencies.high
    }

    oscillator.start();
    oscillator.stop(context.currentTime + 0.1);

    if (gain.gain.value > 0) {
        gain.gain.exponentialRampToValueAtTime(0.00001, context.currentTime + .10)
    }
}