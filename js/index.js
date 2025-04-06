import * as THREE from 'three'; // Three.js

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
        if (this.loadingScreen) this.loadingScreen.classList.remove("hidden");
        const funcs = funcList.map(f => f.func);
        const promiseSequence = funcs.reduce((promise, func, idx) => {
            return promise.then(() => {
                this.loadingText.textContent = funcList[idx].text;
                this.loadingProgressBar.style.width = `${Math.round((100 / funcList.length) * idx)}%`;
                func()
            });
        }, Promise.resolve());
        // Resolve the promise sequence when all functions have been executed
        promiseSequence.then(() => {
            this.loadingScreen.classList.add("hidden"); // Hide the loading screen
            if (this.loadingTips) this.loadingTips.textContent = ''; // Clear the loading tips
            if (callback) callback(); // Execute the callback function
        });
    }
}

class MB_InputManager {
    /**
     * Initializes a new instance of the MB_InputManager class.
     * @param {number} [inputThreshold=1] - Minimum input value required to trigger a player movement event.
     * @returns {MB_InputManager}
     */
    constructor(inputThreshold = 1) {
        this.playerMovementInput = new THREE.Vector2(0, 0);
        this.inputThreshold = inputThreshold;
    }

    /**
     * Subscribes to document events that trigger a player movement event.
     * @param {boolean} showCursor - Whether or not to show the mouse cursor.
     * @param {boolean} lockCursor - Whether or not to lock the mouse cursor to the center of the canvas.
     * @param {function} onMovementChange - Callback function that is invoked when the player movement input changes.
     * @param {THREE.Vector2} onMovementChange.playerMovementInput - The player movement input.
     * @param {MouseEvent} onMovementChange.event - The event that triggered the player movement input change.
     */
    subscribeToEvents(showCursor, lockCursor, onMovementChange) {
        // On key down, get the pressed key unless an input field is in focus.
        document.addEventListener("keydown", event => {
            if (!event.target.matches("input,textarea")) {
                // Keys can be combined (e.g.: W and D key press allows for diagonal movement)
                switch (event.key) {
                    case "W":
                    case "w":
                    case "ArrowUp":
                        this.playerMovementInput.y = this.inputThreshold;
                        break;
                    case "A":
                    case "a":
                    case "ArrowLeft":
                        this.playerMovementInput.x = -this.inputThreshold;
                        break;
                    case "S":
                    case "s":
                    case "ArrowDown":
                        this.playerMovementInput.y = -this.inputThreshold;
                        break;
                    case "D":
                    case "d":
                    case "ArrowRight":
                        this.playerMovementInput.x = this.inputThreshold;
                        break;
                }
            }
            if (onMovementChange) onMovementChange(this.playerMovementInput, event);
        });
        // Enable/disable the mouse cursor
        document.body.style.cursor = showCursor ? "default" : "none";
        // Lock the mouse cursor to the center of the canvas
        if (lockCursor) {
            document.body.requestPointerLock()
        }
        document.addEventListener("mousemove",event => {
            // Update the player's movement input based on mouse movement
            this.playerMovementInput.x = event.movementX;
            this.playerMovementInput.y = event.movementY;
            if (onMovementChange) onMovementChange(this.playerMovementInput, event);
        });
    }

    /**
     * Shows the mouse cursor
     * @returns {void}
     */
    showCursor() {
        this.cursor.style.display = "default";
    }

    /**
     * Releases the mouse cursor from being locked to the center of the canvas.
     * @returns {void}
     */
    unlockCursor() {
        document.exitPointerLock();
    }
}

class MB_HomeCanvasManager {
    /**
     * Initializes a new instance of the MB_HomeCanvasManager class.
     * @param {HTMLElement} containerElement - The container element for the canvas.
     * @returns {MB_HomeCanvasManager}
     */
    constructor(containerElement) {
        this.container = containerElement;
    }

    /**
     * Creates a new 3D viewport by creating a new scene with THREE.js and rendering it to the canvas.
     * @returns {void}
     */
    create3DViewport() {
        // Create a new scene with THREE.js
        this.scene = new THREE.Scene();
        // Create a camera
        const camera = new THREE.PerspectiveCamera(
            75,
            this.container.clientWidth / this.container.clientHeight,
            0.1,
            1000
        );
        camera.position.z = 5;
        this.scene.background = new THREE.Color(255, 184, 184);
        this.scene.add(camera);
        // Render the scene to the canvas
        this.renderer = new THREE.WebGLRenderer();
        this.renderer.setClearColor(0xffffff, 1)
        this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);
        this.renderer.domElement.style = "width: 100%; height: 100vh; position: absolute; top: 0; left: 0; z-index: -100";
        this.container.appendChild(this.renderer.domElement);
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
const gamepadSupported = true;

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
const inputManager = new MB_InputManager(2);
const homeCanvasManager = new MB_HomeCanvasManager(document.getElementById("homeScreen"));

// Check compatibility
asyncLoadController.initLoadOperation([
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
        // Is the Gamepad API supported?
        if (!navigator.getGamepads()) {
            console.warn("The current browser does not support Gamepad API. The game will still be playable, but use of gamepads is disabled.");
            gamepadSupported = false;
        }
        // Internet Explorer?
        if (navigator.userAgent.indexOf("MSIE ") > -1 || navigator.userAgent.indexOf("Trident/") > -1) {
            console.warn("Internet Explorer is not supported. The game will still be playable, but some features may not work as expected.");
        }
    }),
    new MB_AsyncLoadOperation("Loading main menu...",() => {
        // Create a new WebGL viewport
        homeCanvasManager.create3DViewport();
    })
], function() {

});