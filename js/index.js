class MB_AsyncLoadOperation {
    /**
     * Initializes a new instance of the MB_AsyncLoadOperation class.
     * @param {string} text - Text to display during the loading process.
     * @param {function} func - Function to execute during the loading process.
     */
    constructor(text, func) {
        this.text = text;
        this.func = func;
    } 
}

class MB_AsyncLoadController {
    /**
     * Initializes a new instance of the MB_AsyncLoadController class.
     * @param {Object} options - Configuration options for the controller.
     * @param {HTMLElement} [options.loadingScreen] - HTML element containing the loading screen (optional).
     * @param {HTMLElement} options.loadingText - HTML element containing the loading text (required).
     * @param {HTMLElement} options.loadingPercentage - HTML element containing the loading percentage (required).
     * @param {HTMLElement} [options.loadingProgressBar] - HTML element that will be resized based on loading progress (optional).
     * @param {HTMLElement} [options.loadingTips] - HTML element containing the loading tips (optional).
     * @param {Array<string>} [options.tips] - Array of strings containing tips to show during the loading process (optional).
     * @returns {MB_AsyncLoadController}
     */
    constructor (options) {
        this.loadingScreen = options.loadingScreen; // HTML element containing the loading screen (optional)
        this.loadingText = options.loadingText; // HTML element containing the loading text (required)
        this.loadingPercentage = options.loadingPercentage; // HTML element containing the loading percentage (required)
        this.loadingProgressBar = options.loadingProgressBar; // HTML element that will be resized based on loading progress (optional)
        this.loadingTips = options.loadingTips; // HTML element containing the loading tips (optional)
        this.tips = options.tips || []; // Array of strings containing tips to show during the loading process (optional)
    }

    /**
     * Initializes a new loading operation by creating a Promise resolution
     * when each function in the "funcs" array has been completed.
     * @param {Array<MB_AsyncLoadOperation>} funcList - Array of objects containing functions to be executed
     * @param {function} [callback] - Function to be executed when all functions have been completed
     * @returns {void}
     */
    initLoadOperation (funcList, callback) {
        // Create a Promise resolution when each
        // function in "funcs" array has been completed
        var tipInterval;
        // Display a random tip from this.tips array (if populated) every 10 seconds until the loading
        // operation has completed.
        if (this.loadingTips && this.tips.length > 0) {
            tipInterval = setInterval(() => {
                const randomTipIndex = Math.floor(Math.random() * this.tips.length);
                this.loadingTips.textContent = this.tips[randomTipIndex];
            }, 10000);
            this.loadingTips.textContent = this.tips[0]; // Display the first tip initially
        }
        // Hide the loading screen when all functions have been executed
        // and clear the loading tips and progress bar when the promise sequence is resolved
        // or when the callback function is executed
        if (this.loadingScreen) this.loadingScreen.style.display = "block";
        const funcs = [];
        funcList.forEach(f => funcs.push(f.func));
        const promiseSequence = funcs.reduce((promise, func, idx) => {
            return promise.then(() => {
                this.loadingText.textContent = funcList[idx].text;
                this.loadingProgressBar.style.width = `${Math.round((100 / funcList.length) * idx)}%`;
                func()
            });
        }, Promise.resolve());
        // Resolve the promise sequence when all functions have been executed
        promiseSequence.then(() => {
            this.loadingScreen.style.display = 'none'; // Hide the loading screen
            if (this.loadingTips) this.loadingTips.textContent = ''; // Clear the loading tips
            if (callback) callback(); // Execute the callback function
        });
    }
}

function webGLSupported() {
    try {
        const canvas = document.createElement("canvas");
        return!!window.WebGLRenderingContext && (
            canvas.getContext("webgl") ||
            canvas.getContext("experimental-webgl")
        );
    } catch (e) {
        return false;
    }
}

function webSocketsSupported() {
    try {
        return "WebSocket" in window;
    } catch (e) {
        return false;
    }
}

const onlinePlayEnabled = true;

const asyncLoadController = new MB_AsyncLoadController({
    loadingScreen: document.getElementById("loadingScreen"),
    loadingText: document.getElementById("loadingText"),
    loadingPercentage: document.getElementById("loadingPercentage"),
    loadingProgressBar: document.getElementById("loadingProgressBar"),
    loadingTips: document.getElementById("loadingTips"),
    tips: [
        "In some levels, you can jump using the spacebar.",
        "Be careful not to touch the spikes!"
    ]
});

// Check compatibility
asyncLoadController.initLoadOperation(
    new MB_AsyncLoadOperation("Checking compatibility...",() => {
        // Does the browser support WebGL?
        if (!webGLSupported()) {
            document.getElementById("noSupport").style.display = "flex";
            throw new Error("Current browser does not support WebGL.");
        };
        // Does the browser support WebSockets?
        if (!webSocketsSupported()) {
            console.warn("The current browser does not support WebSockets. The game will still be playable, but online play is disabled.");
            onlinePlayEnabled = false;
        }
    })
)