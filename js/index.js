import * as THREE from 'https://cdn.jsdelivr.net/npm/three@latest/build/three.module.js'; // Three.js
import mb_defaultSettings from './settings-default.json' with {type: "json"};
import mb_settingsSchema from './settings-schema.json' with {type: "json"};

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'; // Supabase

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
                this.loadingPercentage.textContent = `${Math.round((100 / funcList.length) * idx)}%`;
                func()
            });
        }, Promise.resolve());
        // Resolve the promise sequence when all functions have been executed
        promiseSequence.then(() => {
            this.loadingPercentage.textContent = "100%";
            this.loadingProgressBar.style.width = "100%";
            this.loadingScreen.classList.add("hidden"); // Hide the loading screen
            if (this.loadingTips) this.loadingTips.textContent = ''; // Clear the loading tips
            if (tipInterval) clearInterval(tipInterval); // Clear the tip interval
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

class MB_AudioManager {
    /**
     * Initializes a new instance of the MB_AudioManager class.
     * @param {HTMLAudioElement} audioElement - The HTML audio element for playing sounds.
     * @returns {MB_AudioManager}
     */
    constructor() {
        this.audioObj = new Audio();
    }

    /**
     * Sets or gets the volume level for the audio element.
     * @param {number} value - A number between 0.0 (muted) and 1.0 (maximum volume) representing the desired volume level.
     * @returns {void}
     */

    set volume(value) {
        this.audioObj.volume = value;
    }

    get volume() {
        return this.audioObj.volume;
    }

    play(src, loop) {
        this.audioObj.src = src;
        this.audioObj.loop = loop;
        this.audioObj.play();
    }
}

class MB_3DSceneUtility {
    static appendObjectFromDataToScene(targetScene, data) {
        
    }
}

class MB_ExternalResource {
    /**
     * Initializes a new instance of the MB_ExternalResource class.
     * @param {string} url - The URL of the external resource.
     * @param {string} type - The type of the resource (e.g., 'css' or 'js').
     */
    constructor(url, type) {
        this.url = url;
        this.type = type;
    }
}

class MB_ResourceLoader {
    
    /**
     * Loads multiple resources from the specified URLs, and appends them to the document
     * either in the head (for CSS) or body (for JS). Resolves when all resources have finished
     * loading, rejects if any resource fails to load.
     * @param {Array<MB_ExternalResource>} resources - The resources to be loaded.
     * @returns {Promise<void>}
     */
    static loadFilesFromURLs(resources) {
        /**
         * Loads a resource from the specified URL, and appends it to the document either
         * in the head (for CSS) or body (for JS). Resolves when the resource has finished
         * loading, rejects if the resource fails to load.
         * @param {string} url - The URL from which to load the resource.
         * @param {'css'|'js'} type - The type of resource to load.
         * @returns {Promise<void>}
         */
        function loadResource(url, type) {
            return new Promise((resolve, reject) => {
              let element;
          
              if (type === 'css') {
                element = document.createElement('link');
                element.rel = 'stylesheet';
                element.href = url;
                document.head.appendChild(element);
              } else if (type === 'js') {
                element = document.createElement('script');
                element.src = url;
                document.body.appendChild(element);
              } else {
                reject(new Error('Invalid resource type specified'));
                return;
              }
          
              element.onload = () => {
                console.log(`${type.toUpperCase()} resource loaded: ${url}`);
                resolve();
              };
          
              element.onerror = () => {
                console.error(`Failed to load ${type.toUpperCase()} resource: ${url}`);
                reject(new Error(`Failed to load resource: ${url}`));
              };
            });
        }
        
        const rsrces = resources.map(rsrc => loadResource(rsrc.url, rsrc.type))
        return Promise.all(rsrces);
    }
}

class MB_StorageManager {
    /**
     * Initializes a new instance of the MB_StorageManager class.
     * @param {JSONEditor} settingsEditor - The JSONEditor to use for saving and loading settings.
     * @param {HTMLElement} debugOverlay - The HTML element to use for displaying debug information.
     * @returns {MB_StorageManager}
     */
    constructor(settingsEditor, debugOverlay) {
        this.settingsEditor = settingsEditor; // a JSONEditor
        this.debugOverlay = debugOverlay; // a div element
        this.debugInfoInterval = null;
        this.fpsLoop = new Date();
    }

    /**
     * Checks if the local storage is available and functional.
     * Attempts to set and remove an item from the storage to verify availability.
     * 
     * @returns {boolean} true if the storage is available and functional, false if the storage is not available 
     * or if storage quota is exceeded.
     */
    localStorageAvailable() {
        /**
         * Checks if the specified type of web storage is available and functional.
         * Attempts to set and remove an item from the storage to verify availability.
         * 
         * @param {string} type - The type of storage to check ('localStorage' or 'sessionStorage').
         * @returns {boolean} true if the storage is available and functional, false if the storage is not available 
         * or if storage quota is exceeded.
         */
        function storageAvailable(type) {
            let storage;
            try {
                storage = window[type];
                const x = "__storage_test__";
                storage.setItem(x, x);
                storage.removeItem(x);
                return true;
            } catch (e) {
                return (
                e instanceof DOMException &&
                e.name === "QuotaExceededError" &&
                // acknowledge QuotaExceededError only if there's something already stored
                storage &&
                storage.length !== 0
                );
            }
        }
        try {
            return storageAvailable("localStorage")
        } catch (error) {
            // Got a SecurityError, assuming not available
            return false;
        }
    }

    /**
     * Initializes the settings editor with values from local storage or default settings.
     * Sets up an event listener to save changes to local storage whenever the editor's content changes.
     * @returns {void}
     */
    setupEditors() {
        if (this.settingsEditor.ready) {
            this.settingsEditor.setValue(
                JSON.parse(localStorage.getItem("MB_Settings")) ||
                mb_defaultSettings
            );
        } else {
            this.settingsEditor.on("ready", () => {
                this.settingsEditor.setValue(
                    JSON.parse(localStorage.getItem("MB_Settings")) ||
                    mb_defaultSettings
                );
            })
        }
        this.settingsEditor.on("change", () => {
            if (this.settingsEditor.validate().length) {
                console.error("MB_StorageManager: Error while parsing new settings:", this.settingsEditor.validate());
                return;
            }
            localStorage.setItem("MB_Settings", JSON.stringify(this.settingsEditor.getValue()));
            this.refresh()
        });
    }

    refresh() {
        const $settings = JSON.parse(localStorage.getItem("MB_Settings")) || mb_defaultSettings;
        this.debugOverlay.style.display = $settings.display.debugMode ? "block" : "none";
        if ($settings.display.debugMode) {
            if (!this.debugInfoInterval) {
                this.debugInfoInterval = setInterval(() => {
                    var $fps = Math.round(1000 / performance.now());
                    this.debugOverlay.innerText = `
                        FPS: ${$fps}
                        UserAgent: ${navigator.userAgent}
                    `;
                });
            }
        } else {
            if (this.debugInfoInterval) {
                clearInterval(this.debugInfoInterval);
                this.debugInfoInterval = null;
            }
        }
    }
}

class MB_ToastManager {
    /**
     * Initializes a new instance of the MB_ToastManager class.
     * @param {HTMLElement} toastContainer - The HTML element to append toast messages to.
     * @returns {MB_ToastManager}
     */
    constructor(toastContainer) {
        this.toastContainer = toastContainer;
    }

    pop(message) {
        var $toast = document.createElement("div");
        $toast.classList.add("toast");
        $toast.innerText = message;
        this.toastContainer.appendChild($toast);
        setTimeout(() => {
            $toast.remove();
        }, 5000);
    }
}

class MB_AccountManager {
    /**
     * Initializes a new instance of the MB_AccountManager class.
     * @param {Object} options - Configuration options for the account manager.
     * @param {HTMLInputElement} options.SIEmailInputField - The email input field element for sign-in.
     * @param {HTMLInputElement} options.SIPasswordInputField - The password input field element for sign-in.
     * @param {HTMLButtonElement} options.SIBtn - The button element for sign-in action.
     * @param {HTMLElement} options.SIErrorContainer - The container element for sign-in error messages.
     * @param {HTMLImageElement} options.accountImage - The image element for the account icon.
     * @param {HTMLElement} options.accountDisplayName - The display name element for the account.
     * @param {HTMLButtonElement} options.SOBtn - The button element for sign-out action.
     * @param {string} options.SUPABASE_URL - The Supabase URL.
     * @param {string} options.SUPABASE_KEY - The Supabase key.
     */
    constructor(options) {
        this.SIEmailInputField = options.SIEmailInputField;
        this.SIPasswordInputField = options.SIPasswordInputField;
        this.SIBtn = options.SIBtn;
        this.SIBtn.onclick = () => this.signIn(this.SIEmailInputField.value, this.SIPasswordInputField.value);
        this.SIErrorContainer = options.SIErrorContainer;
        this.accountImage = options.accountImage;
        this.accountDisplayName = options.accountDisplayName;
        this.SOBtn = options.SOBtn;
        this.SOBtn.onclick = () => this.signOut();
        this.SUPABASE_URL = options.SUPABASE_URL;
        this.SUPABASE_KEY = options.SUPABASE_KEY;
        this.supabase = createClient(this.SUPABASE_URL, this.SUPABASE_KEY);
        console.log("Supabase instance:", this.supabase);
        
    }

    /**
     * Signs the user in to their account using Supabase authentication.
     * @param {string} email - The user's email address.
     * @param {string} password - The user's password.
     * @returns {Promise<object>} A promise that resolves with the sign-in result.
     */
    async signIn(email, password) {
        const res = await this.supabase.auth.signInWithPassword({
            email: email,
            password: password,
        });
        if (!res.error) {
            console.log("MB_AccountManager: User was signed in successfully")
        } else {
            console.log("MB_AccountManager: Error signing in:", res.error)
        }
        console.log("Sign In Result:", res);
        return res;
    }

    /**
     * Retrieves the current authenticated user's information from Supabase.
     * @returns {Promise<object>} A promise that resolves with the user data. 
     * The user data is accessible under `res.data.user`.
     */
    async getCurrentUser() {
        const res = await this.supabase.auth.getUser();
        return res; // User data is under res.data.user
    }

    /**
     * Retrieves the user record from the Supabase 'users' table corresponding to the currently signed-in user.
     * @returns {Promise<object>} A promise that resolves with the user record.
     */
    async getCurrentUserRecord() {
        const res = await this.supabase.from('users').select('*').eq('id', this.getCurrentUser().data.user.id).single();
        return res;
    }


    /**
     * Signs the user out of their account using Supabase authentication.
     * @returns {Promise<object>} A promise that resolves with the sign-out result.
     */
    async signOut() {
        const res = await this.supabase.auth.signOut();
        return res;
    }
    
    /**
     * Refreshes the display of the account management UI based on the current user's signed-in status.
     * If the user is signed in, displays the account image and name, and hides the sign-in form.
     * If the user is not signed in, displays the sign-in form and hides the account image and name.
     */
    async refreshDisplay() {
        this.getCurrentUser().then(res => {
            if (res.data.user) {
                this.getCurrentUserRecord().then(rec => {
                    this.accountImage.src = rec.data.photo_url;
                    this.accountDisplayName.innerText = rec.data.display_name;
                    this.accountDisplayName.style.display = "block";
                    this.accountImage.style.display = "block";
                });
                this.SIBtn.style.display = "none";
                this.SOBtn.style.display = "block";
                this.SIEmailInputField.style.display = "none";
                this.SIPasswordInputField.style.display = "none";
                this.SIErrorContainer.innerText = "";
                this.SIErrorContainer.style.display = "none";
            } else {
                // User is not signed in
                this.accountImage.style.display = "none";
                this.accountDisplayName.style.display = "none";
                this.accountImage.src = "";
                this.accountDisplayName.innerText = "";
                this.SIBtn.style.display = "block";
                this.SOBtn.style.display = "none";
                this.SIEmailInputField.style.display = "block";
                this.SIPasswordInputField.style.display = "block";
                this.SIErrorContainer.innerText = "";
                this.SIErrorContainer.style.display = "block";
            }
        })
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
        this.scene.add(new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial({color: 0x00ff00})))
        // Render the scene to the canvas
        this.renderer = new THREE.WebGLRenderer();
        this.renderer.setClearColor(0xffffff, 1)
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.domElement.style = "width: 100%; height: 100vh; position: absolute; top: 0; left: 0; z-index: -100";
        this.container.appendChild(this.renderer.domElement);
        this.renderer.setAnimationLoop(() => {this.renderer.render(this.scene, camera)});
    }
}

/**
 * Checks if WebGL is supported by the browser.
 * @returns {boolean} true if WebGL is supported, false otherwise
 */
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

/**
 * Checks if WebSockets are supported by the browser.
 * @returns {boolean} true if WebSockets are supported, false otherwise
 */

function webSocketsSupported() {
    try {
        return "WebSocket" in window;
    } catch (e) {
        return false;
    }
}

const onlinePlayEnabled = true;
const gamepadSupported = true;
const dataSaving = true;

var settingsEditor;

const asyncLoadController = new MB_AsyncLoadController({
    loadingScreen: document.getElementById("loadingScreen"),
    loadingText: document.getElementById("loadingTextLeft"),
    loadingPercentage: document.getElementById("loadingTextRight"),
    loadingProgressBar: document.getElementById("loadingProgressBar"),
    loadingTips: document.getElementById("loadingTips"),
    tips: [
        "In some levels, you can jump using the spacebar.",
        "Be careful not to touch the spikes!",
    ]
});
const inputManager = new MB_InputManager(2);
const homeCanvasManager = new MB_HomeCanvasManager(document.getElementById("homeScreen"));
const audioManager = new MB_AudioManager();
const toastManager = new MB_ToastManager(document.getElementById("toastContainer"));
const accountManager = new MB_AccountManager({
    SIEmailInputField: document.getElementById("accountEmailInput"),
    SIPasswordInputField: document.getElementById("accountPasswordInput"),
    SIBtn: document.getElementById("accountSIBtn"),
    SIErrorContainer: document.getElementById("accountError"),
    accountImage: document.getElementById("accountImage"),
    accountDisplayName: document.getElementById("accountDisplayName"),
    SOBtn: document.getElementById("accountSignOutBtn"),
    SUPABASE_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtwbXN6dHV4cmxydGJueHhyaHBqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA3OTA1MzYsImV4cCI6MjA1NjM2NjUzNn0.wxYd_XO12CKjUeQZ1_MRPnD5o_S8KBK9XDKL0jh1I1I",
    SUPABASE_URL: "https://kpmsztuxrlrtbnxxrhpj.supabase.co",
});
var storageManager;



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
        // 
        // Internet Explorer?
        if (navigator.userAgent.indexOf("MSIE ") > -1 || navigator.userAgent.indexOf("Trident/") > -1) {
            console.warn("Internet Explorer is not supported. The game will still be playable, but some features may not work as expected.");
        }
    }),
    new MB_AsyncLoadOperation("Loading JSONEditors...", () => {
        settingsEditor = new JSONEditor(document.getElementById("settingsContainer"),{
            schema: mb_settingsSchema,
            theme: "barebones",
            required_by_default: true,
            disable_collapse: true,
            disable_edit_json: true,
            disable_properties: true,
            no_additional_properties: true,
            show_errors: "change",
            enable_array_copy: false,
            compact: true,
            
        });
        storageManager = new MB_StorageManager(settingsEditor, document.getElementById("debugOverlay"));
        storageManager.setupEditors();
    }),
    new MB_AsyncLoadOperation("Loading toast...", () => {
        toastManager.pop("This is a toast.")
    }),
    new MB_AsyncLoadOperation("Loading confirmation dialog...", () => {
        // When the user closes the page, display a confirmation before closing
        window.addEventListener("beforeunload", function(event) {
            event.preventDefault();
            event.returnValue = "Are you sure you want to exit the game?";
            return "Are you sure you want to exit the game?";
        });
    }),
    new MB_AsyncLoadOperation("Loading main menu...",() => {
        // Create a new WebGL viewport
        homeCanvasManager.create3DViewport();
    })
], function() {

});