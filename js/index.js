import { createClient } from 'supabase-js'; // Supabase
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

import * as THREE from 'three'; // Three.js

import mb_defaultSettings from './settings-default.json' with {type: "json"};
import mb_settingsSchema from './settings-schema.json' with {type: "json"};

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

class MB_GamepadManager {
    /**
     * Initializes a new instance of the MB_GamepadManager class.
     * @param {MB_InputManager} inputManager - The input manager instance to use.
     * @returns {MB_GamepadManager}
     */
    constructor(inputManager) {
        this.inputManager = inputManager;
        window.addEventListener("gamepadconnected", event => {
            console.log(
                "Gamepad connected at index %d: %s. %d buttons, %d axes.",
                e.gamepad.index,
                e.gamepad.id,
                e.gamepad.buttons.length,
                e.gamepad.axes.length,
            );
        });
        window.addEventListener("gamepaddisconnected", event => {
            console.log(
                "Gamepad disconnected at index %d: %s.",
                e.gamepad.index,
                e.gamepad.id,
            );
        });
    }

    vibrateGamepad(intensity, duration) {
        if (navigator.getGamepads) {
            const gamepads = navigator.getGamepads();
            if (gamepads.length > 0) {
                gamepads[0].vibrationActuator.playEffect("dual-rumble", {
                    duration: duration,
                    weakMagnitude: intensity,
                    strongMagnitude: intensity,
                });
            } else {
                console.error("No gamepads found.");
            }
        } else {
            console.error("Gamepad vibration is not supported in this browser.");
        }
    }

    getLeftStick() {
        const gamepads = navigator.getGamepads();
        if (gamepads.length > 0) {
            const gamepad = gamepads[0];
            if (gamepad.axes.length > 0) {
                return new THREE.Vector2(gamepad.axes[0] * this.inputManager.inputThreshold, gamepad.axes[1] * this.inputManager.inputThreshold);
            } else {
                console.error("Gamepad axes are not available.");
            }
        } else {
            console.error("No gamepads found.");
        }
    }

    getRightStick() {
        const gamepads = navigator.getGamepads();
        if (gamepads.length > 0) {
            const gamepad = gamepads[0];
            if (gamepad.axes.length > 0) {
                return new THREE.Vector2(gamepad.axes[2] * this.inputManager.inputThreshold, gamepad.axes[3] * this.inputManager.inputThreshold);
            } else {
                console.error("Gamepad axes are not available.");
            }
        } else {
            console.error("No gamepads found.");
        }
    }

    getLeftTrigger() {
        const gamepads = navigator.getGamepads();
        if (gamepads.length > 0) {
            const gamepad = gamepads[0];
            if (gamepad.buttons.length > 0) {
                return gamepad.buttons[0].value;
            } else {
                console.error("Gamepad buttons are not available.");
            }
        } else {
            console.error("No gamepads found.");
        }
    }

    getRightTrigger() {
        const gamepads = navigator.getGamepads();
        if (gamepads.length > 0) {
            const gamepad = gamepads[0];
            if (gamepad.buttons.length > 0) {
                return gamepad.buttons[1].value;
            } else {
                console.error("Gamepad buttons are not available.");
            }
        } else {
            console.error("No gamepads found.");
        }
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
    static appendObjectsFromDataToScene(targetScene, data) {
        
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
        this.stats = new Stats();
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

    /**
     * @function createFpsCounter
     * @description Creates an FPS (Frames Per Second) counter.
     *
     * The counter keeps track of the number of frames rendered within a specified time interval.
     * It provides a method to update the counter and a method to get the current FPS value.
     *
     * @param {number} interval - The time interval in milliseconds to calculate the FPS.
     * @returns {Object} - An object with two methods: update() and getFps().
     * 
     * @throws {Error} Throws an error if the interval parameter is not a positive number.
     * 
     * @example 
     * // Create an FPS counter with a 1-second interval
     * const fpsCounter = createFpsCounter(1000);
     *
     * // Update the counter on each frame render
     * fpsCounter.update();
     *
     * // Get the current FPS value
     * const fps = fpsCounter.getFps();
     * console.log(`Current FPS: ${fps}`);
     */

    refresh() {
        const $settings = JSON.parse(localStorage.getItem("MB_Settings")) || mb_defaultSettings;
        
    }
}

class MB_PerformanceManager {
    /**
     * Initializes a new instance of the MB_PerformanceManager class.
     * @param {Object} options - Configuration options for the performance manager.
     * @param {MB_StorageManager} options.storageManager - The storage manager instance to use.
     * @param {MB_InputManager} options.inputManager - The input manager instance to use.
     * @param {HTMLElement} options.debugOverlay - The HTML element to use for displaying debug information.
     * @returns {MB_PerformanceManager}
     */
    constructor(options) {
        this.storageManager = options.storageManager;
        this.inputManager = options.inputManager;
        this.debugOverlay = options.debugOverlay;
        /** @private */
        this.$lastFrame = performance.now();
        /** @private */
        this.$frameCount = 0;
    }

    /**
     * Updates the performance metrics by counting the number of frames rendered since the last call.
     * Calculates the FPS (Frames Per Second) by dividing the frame count by the time difference between the current and last frame.
     * If the time difference is greater than 1000 milliseconds, the FPS value is updated.
     * @returns {void}
     */
    tick() {
        const $currentFrame = performance.now();
        const $deltaTime = $currentFrame - this.$lastFrame;
        const $settings = JSON.parse(localStorage.getItem("MB_Settings")) || mb_defaultSettings;
        this.$frameCount++;
        if ($deltaTime >= 1000) {
            this.fps = this.$frameCount;
            this.$frameCount = 0;
            this.$lastFrame = $currentFrame;
            this.debugOverlay.style.display = $settings.display.debugMode ? "block" : "none";
            this.debugOverlay.innerText = `
                FPS: ${this.fps}
                Time: ${$deltaTime / 1000} seconds
                Frame Count: ${this.$frameCount}
                PlayerMovement: ${this.inputManager.playerMovementInput.toString()}
            `;
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
        this.refreshDisplay();
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
        this.refreshDisplay();
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
        this.refreshDisplay();
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

class MB_User {
    constructor(options) {
        this.display_name = options.display_name;
        this.photo_url = options.photo_url;
    }
}

class MB_Chapter {
    /**
     * Initializes a new instance of the MB_Chapter class.
     * @param {Object} options - Configuration options for the chapter.
     * @param {string} options.name - The name of the chapter.
     * @param {string} options.thumbnail_url - The URL of the thumbnail image for the chapter.
     * @param {Array<MB_Level>} options.levels - An array of levels belonging to the chapter.
     * @param {string} options.id - The unique identifier for the chapter.
     * @returns {MB_Chapter}
     */
    constructor(options) {
        this.name = options.name;
        this.thumbnail_url = options.thumbnail_url;
        this.id = options.id;
    }
}

class MB_Campaign {
    /**
     * Initializes a new instance of the MB_Campaign class.
     * @param {Object} options - Configuration options for the campaign.
     * @param {string} options.name - The name of the campaign.
     * @param {string} options.description - The description of the campaign
     * @param {string} options.thumbnail_url - The URL of the thumbnail image for the campaign.
     * @param {MB_User} [options.owner] - The owner of the campaign.
     * @param {Array<MB_Chapter>} options.chapters - An array of chapters belonging to the campaign.
     * @param {string} options.id - The unique identifier for the campaign.
     * @returns {MB_Campaign}
     */
    constructor(options) {
        this.name = options.name;
        this.description = options.description;
        this.thumbnail_url = options.thumbnail_url;
        this.owner = options.owner;
        this.chapters = options.chapters;
        this.id = options.id;
    }
}

class MB_Level {
    /**
     * Initializes a new instance of the MB_Level class.
     * @param {Object} options - Configuration options for the level.
     * @param {string} options.name - The name of the level.
     * @param {string} options.thumbnail_url - The URL of the thumbnail image for the level.
     * @param {string} options.description - The description of the level.
     * @param {'race' | 'sandbox'} options.type - The type of the level.
     * @param {Object} options.data - The data associated with the level.
     * @param {string} options.id - The unique identifier for the level.
     * @returns {MB_Level}
     */
    constructor(options) {
        this.name = options.name;
        this.thumbnail_url = options.thumbnail_url;
        this.id = options.id;
        this.data = options.data;
        this.type = options.type;
        this.description = options.description;
    }
}

class MB_StringUtility {
    /**
     * Generates a random string of the given length using a specified character set.
     * @param {number} length - The length of the string to generate.
     * @param {boolean} [useUppercase=false] - Whether to include uppercase letters in the charset.
     * @param {boolean} [useNumbers=true] - Whether to include numbers in the charset.
     * @param {boolean} [useLowercase=true] - Whether to include lowercase letters in the charset.
     * @param {boolean} [useSpecialChars=false] - Whether to include special characters in the charset.
     * @returns {string} The generated random string.
     */
    static randomString(length, useUppercase = false, useNumbers = true, useLowercase = true, useSpecialChars = false) {
        const uppercaseChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const lowercaseChars = 'abcdefghijklmnopqrstuvwxyz';
        const numberChars = '0123456789';
        const specialChars = '!@#$%^&*()-_=+[]{}|;:,.<>?';
        const charset = '';
        if (useUppercase) charset += uppercaseChars;
        if (useNumbers) charset += numberChars;
        if (useLowercase) charset += lowercaseChars;
        if (useSpecialChars) charset += specialChars;
        let result = '';
        for (let i = 0; i < length; i++) {
            result += charset.charAt(Math.floor(Math.random() * charset.length));
        }
        return result;
    }
}

class MB_MathUtility {
    /**
     * Linearly interpolates from a to b by t.
     * @param {number} a - The starting value.
     * @param {number} b - The ending value.
     * @param {number} t - The value between 0 and 1 inclusive that specifies the interpolation point.
     * @returns {number} The interpolated value.
     */
    static lerp (a, b, t) {
        return a + (b - a) * t;
    }

    /**
     * Returns a random number between min (inclusive) and max (inclusive)
     * @param {number} min - The minimum value
     * @param {number} max - The maximum value
     * @returns {number} The random number
     */
    static randomArbitrary(min, max) {
        return Math.random() * (max - min) + min;
    }

}

class MB_TreeViewItem {
    /**
     * Initializes a new instance of the MB_TreeViewItem class.
     * @param {Object} options - Configuration options for the tree view item.
     * @param {string} options.text - The text to display for the item.
     * @param {Array<MB_TreeViewItem>} [options.children] - The child items.
     * @param {function(MouseEvent)} [options.onclick] - The function to execute when the item is clicked.
     * @param {function(MouseEvent)} [options.ondblclick] - The function to execute when the item is double-clicked.
     * @param {function(MouseEvent)} [options.oncontextmenu] - The function to execute when the item is right-clicked.
     * @returns {MB_TreeViewItem} The newly created tree view item.
     */
    constructor(options) {
        this.text = options.text;
        this.children = options.children;
        this.onclick = options.onclick;
        this.ondblclick = options.ondblclick;
        this.oncontextmenu = options.oncontextmenu;
    }
}

class MB_HTMLElementUtility {
    /**
     * Hides the specified elements by setting their display style to 'none'.
     * @param {Array<HTMLElement>} elements - The elements to hide.
     * @returns {void}
     */
    static hideElements(elements) {
        for (const element of elements) {
            element.style.display = 'none';
        }
    }

    /**
     * Shows the specified elements with the given display style.
     * @param {Array<HTMLElement>} elements - The elements to show.
     * @param {string} [display='block'] - The display style to apply to the elements.
     * @returns {void}
     */
    static showElements(elements, display = 'block') {
        for (const element of elements) {
            element.style.display = display;
        }
    }

    /**
     * Creates a tree view for the specified items and appends it to the target element.
     * @param {HTMLUListElement} targetElement - The target element to create the tree view for.
     * @param {Array<MB_TreeViewItem>} items - The items to be displayed in the tree view.
     * @returns {void}
     */
    static createTreeView(targetElement, items) {
        items.forEach(item => {
            const li = document.createElement('li');
            li.textContent = item.text;
            targetElement.appendChild(li);

            if (item.children) {
                const ul = document.createElement('ul');
                MB_HTMLElementUtility.createTreeView(ul, item.children);
                li.appendChild(ul);
            }

            if (item.onclick) {
                li.addEventListener('click', item.onclick);
            }

            if (item.ondblclick) {
                li.addEventListener('dblclick', item.ondblclick);
            }

            if (item.oncontextmenu) {
                li.addEventListener('contextmenu', item.oncontextmenu);
            }
        })
    }

}

class MB_LevelManager {
    /**
     * Initializes a new instance of the MB_LevelManager class.
     * @param {Object} options - Configuration options for the level manager.
     * 
     * @param {HTMLElement} options.timerContainer - The container element for the timer display.
     * @param {HTMLButtonElement} options.pauseBtn - The button element for pausing the level.
     * @param {HTMLElement} options.levelViewportContainer - The container element for the level viewport.
     * 
     * @param {HTMLElement} options.levelScreen - The screen element for displaying the level.
     * @param {HTMLImageElement} options.levelImageHolder - The element for holding the level image.
     * @param {HTMLElement} options.levelInfoContainer - The container element for the level information.
     * @param {HTMLButtonElement} options.levelHostBtn - The button element for hosting the level.
     * @param {HTMLButtonElement} options.levelCloseHostBtn - The button element for closing the level host.
     * @param {HTMLInputElement} options.levelJoinCodeDisplay - The element for displaying the join code.
     * @param {HTMLInputElement} options.levelJoinCodeInput - The input element for entering the join code.
     * @param {HTMLButtonElement} options.levelPlayBtn - The button element for starting the level.
     * @param {HTMLButtonElement} options.levelEditBtn - The button element for editing the level.
     * @param {HTMLElement} options.levelPlayersAmountContainer - The container element for displaying the number of players.
     * @param {HTMLElement} options.levelJoinedPlayersList - The list element for displaying joined players.
     * 
     * 
     * @param {HTMLElement} options.levelEditorScreen - The screen element for displaying the level editor.
     * @param {HTMLElement} options.levelEditorFilePath - The path element for the level editor file.
     * @param {HTMLElement} options.levelEditorContextMenuContainer - The container element for the level editor context menu.
     * @param {HTMLUListElement} options.levelEditorMenuContainer - The container element for the level editor menu.
     * @param {HTMLButtonElement} options.levelEditorMenuBtn - The button element for the level editor menu.
     * @param {HTMLUListElement} options.levelEditorSceneGraph - The element for displaying the level editor scene graph.
     * @param {HTMLElement} options.levelEditorInspector - The element for displaying the level editor inspector.
     * @param {HTMLElement} options.levelEditorViewportContainer - The container element for the level editor viewport.
     * 
     * @param {MB_ToastManager} options.toastManager - The toast manager for displaying messages.
     * @param {MB_AsyncLoadController} options.asyncLoadController - The asynchronous loading controller for managing loading operations.
     */
    constructor(options) {
        this.timerContainer = options.timerContainer;
        this.pauseBtn = options.pauseBtn;
        this.levelViewportContainer = options.levelViewportContainer;
        this.levelScreen = options.levelScreen;

        this.levelImageHolder = options.levelImageHolder;
        this.levelInfoContainer = options.levelInfoContainer;
        this.levelHostBtn = options.levelHostBtn;
        this.levelCloseHostBtn = options.levelCloseHostBtn;
        this.levelJoinCodeDisplay = options.levelJoinCodeDisplay;
        this.levelJoinCodeInput = options.levelJoinCodeInput;
        this.levelPlayBtn = options.levelPlayBtn;
        this.levelEditBtn = options.levelEditBtn;
        this.levelPlayersAmountContainer = options.levelPlayersAmountContainer;
        this.levelJoinedPlayersList = options.levelJoinedPlayersList;

        this.levelEditorScreen = options.levelEditorScreen;
        this.levelEditorFilePath = options.levelEditorFilePath;
        this.levelEditorContextMenuContainer = options.levelEditorContextMenuContainer;
        this.levelEditorMenuContainer = options.levelEditorMenuContainer;
        this.levelEditorMenuBtn = options.levelEditorMenuBtn;
        this.levelEditorSceneGraph = options.levelEditorSceneGraph;
        this.levelEditorInspector = options.levelEditorInspector;
        this.levelEditorViewportContainer = options.levelEditorViewportContainer;
        this.levelEditorScene = null;
        this.levelEditorCamera = null;

        this.toastManager = options.toastManager;
        this.asyncLoadController = options.asyncLoadController;

        this.currentLevelTick = () => {};
        this.editedLevelTick = () => {};
    }

    /**
     * Displays the level on the level screen by setting the level screen's display property to block
     * and setting the level image holder's src attribute to the thumbnail URL of the level.
     * @param {MB_Level} level - The level to display.
     * @returns {void}
     */
    displayLevel(level) {
        this.levelScreen.style.display = "block";
        this.levelImageHolder.src = level.thumbnail_url;
        this.levelInfoContainer.innerHTML = `
            <h1>${level.name}</h1>
            <p>${level.description}</p>
        `;
        MB_HTMLElementUtility.hideElements([
            this.levelHostBtn,
            this.levelCloseHostBtn,
            this.levelJoinCodeDisplay,
            this.levelJoinCodeInput,
            this.levelPlayersAmountContainer,
            this.levelJoinedPlayersList
        ]);
        this.levelPlayBtn.onclick = () => this.playLevel(level);
    }

    playLevel(level) {
        this.asyncLoadController.initLoadOperation([
            new MB_AsyncLoadOperation("Loading level...", () => {
                this.networkManager.init(level);
            })
        ])
    }

    /**
     * Initializes the level editing operation by loading the level editor
     * and setting the editor file path display to the specified campaign,
     * chapter, and level name.
     * @param {MB_Level} level - The level to be edited.
     * @param {string} campaignName - The name of the campaign containing the level.
     * @param {string} chapterName - The name of the chapter containing the level.
     * @returns {void}
     */
    editLevel(level, campaignName, chapterName) {
        this.asyncLoadController.initLoadOperation([
            new MB_AsyncLoadOperation("Loading editor...", () => {
                this.levelEditorFilePath.innerHTML = `${campaignName}/${chapterName}/${level.name}.mbrace`;
                this.levelEditorScreen.style.display = "block";
                MB_HTMLElementUtility.createTreeView(this.levelEditorMenuContainer, [
                    new MB_TreeViewItem({
                        text: "Close",
                        onclick: () => {
                            this.levelEditorMenuContainer.style.display = "none";
                        }
                    }),
                    new MB_TreeViewItem({
                        text: "Save",
                        onclick: () => {
                            this.levelEditorScreen.style.display = "none";
                        }
                    }),
                    new MB_TreeViewItem({
                        text: "Exit",
                        onclick: () => {
                            if(confirm("Are you sure you want to exit the level editor?")) {
                                this.levelEditorScreen.style.display = "none";
                            }
                        }
                    })
                ]);
                this.levelEditorScene = new THREE.Scene();
                this.levelEditorCamera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
                this.levelEditorCamera.position.set(5, 5, 0);
                this.levelEditorScene.add(new THREE.GridHelper(100, 100));
                this.levelEditorScene.add(new THREE.AxesHelper(10));
                this.levelEditorScene.children.forEach(child => {});
            }),
        ])
    }
}

class MB_NetworkManager {
    /**
     * Initializes a new instance of the MB_NetworkManager class.
     * @param {Object} options - Configuration options for the network manager.
     * @param {Object} [options.servers] - Optional configuration for the WebRTC servers to use. If this is not provided, the default servers will be used.
     * @returns {MB_NetworkManager}
     */
    constructor(options) {
        this.useWebRTC = true;
        if (!this.webRTCSupported()) {
            console.warn("MB_NetworkManager: WebRTC is not supported.");
            this.useWebRTC = false;
        }
        this.servers = options.servers || {
            iceServers: [
                "stun:stun.l.google.com:19302",
                "stun:stun1.l.google.com:19302",
                "stun:stun2.l.google.com:19302",
                "stun:stun3.l.google.com:19302",
                "stun:stun4.l.google.com:19302",
            ],
        }; 
        this.peerConnection = new RTCPeerConnection(this.servers);
    }

    /**
     * Checks if WebRTC is supported by the browser.
     * @returns {boolean} true if WebRTC is supported, false otherwise
     */
    webRTCSupported() {
        try {
            return "RTCPeerConnection" in window;
        } catch (e) {
            return false;
        }
    }

    openRoom(callbacks = {onmessage(event){}, onicecandidate(event){}, onerror(event){}, onopen(event){}, onclose(event){}}) {
        this.currentDataChannel = this.peerConnection.createDataChannel("MB_GameStateChannel_" + MB_StringUtility.randomString(10, false, true, true, false));
        this.currentDataChannel.onmessage = evt => callbacks.onmessage(evt);
        this.currentDataChannel.onicecandidate = evt => callbacks.onicecandidate(evt);
        this.currentDataChannel.onerror = evt => callbacks.onerror(evt);
        this.currentDataChannel.onopen = evt => callbacks.onopen(evt);
        this.currentDataChannel.onclose = evt => callbacks.onclose(evt);
    }
}

class MB_HomeCanvasManager {
    /**
     * Initializes a new instance of the MB_HomeCanvasManager class.
     * @param {HTMLElement} containerElement - The container element for the canvas.
     * @param {MB_PerformanceManager} performanceManager - The performance manager instance.
     * @returns {MB_HomeCanvasManager}
     */
    constructor(containerElement, performanceManager) {
        this.container = containerElement;
        this.performanceManager = performanceManager;
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
            .1,
            1000
        );
        const defaultMaterial = new THREE.MeshMatcapMaterial({
            color: 0xffffff,
            map: new THREE.TextureLoader().load("../img/texture/default.png")
        })
        // Create a cylinder mesh
        const cylinder = new THREE.Mesh(
            new THREE.CylinderGeometry(5, 5, 10, 32),
            defaultMaterial
        );
        cylinder.position.set(0, -4.5, 0);
        // Create a sphere mesh
        const sphere = new THREE.Mesh(
            new THREE.SphereGeometry(1, 32, 16),
            defaultMaterial
        )
        sphere.position.set(4, .2, 0);
        sphere.scale.set(.7, .7, .7);
        // Create a DirectionalLight
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);

        directionalLight.position.set(-3, 13, 9);
        camera.position.z = 5;
        this.scene.background = new THREE.Color(255, 184, 184);
        this.scene.add(directionalLight);
        this.scene.add(cylinder);
        this.scene.add(sphere);
        // Render the scene to the canvas
        this.renderer = new THREE.WebGLRenderer();
        this.renderer.setClearColor(0xffffff, 1)
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.domElement.style = "width: 100%; height: 100vh; position: absolute; top: 0; left: 0; z-index: -100";
        this.container.appendChild(this.renderer.domElement);
        this.renderer.setAnimationLoop(() => {
            this.renderer.render(this.scene, camera);
            // Every frame, slightly rotate the cylinder and the sphere
            cylinder.rotation.y += 0.01;
            sphere.rotation.x += 0.01;
            this.performanceManager.tick();
        });
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

function webRTCSupported() {
    try {
        return "RTCPeerConnection" in window;
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
var homeCanvasManager;
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
const levelManager = new MB_LevelManager({
    timerContainer: document.getElementById("currentLevelTimer"),
    pauseBtn: document.getElementById("currentLevelPauseBtn"),
    levelScreen: document.getElementById("levelScreen"),
    levelImageHolder: document.getElementById("levelImage"),
    levelInfoContainer: document.getElementById("levelInfoContainer"),
    levelHostBtn: document.getElementById("levelHostBtn"),
    levelCloseHostBtn: document.getElementById("levelCloseHostBtn"),
    levelJoinCodeDisplay: document.getElementById("levelJoinCode"),
    levelJoinCodeInput: document.getElementById("levelJoinInput"),
    levelPlayBtn: document.getElementById("levelPlayBtn"),
    levelEditBtn: document.getElementById("levelEditBtn"),
    levelPlayersAmountContainer: document.getElementById("levelPlayersAmount"),
    levelJoinedPlayersList: document.getElementById("levelJoinedPlayersList"),
    toastManager: toastManager,
    asyncLoadController: asyncLoadController
});
var performanceManager;
var storageManager;



window.onload = () => {
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
            if (navigator.userAgent.indexOf("MSIE") > -1 || navigator.userAgent.indexOf("Trident/") > -1) {
                console.warn("Internet Explorer is not supported. The game will still be playable, but some features may not work as expected.");
            }
        }),
        new MB_AsyncLoadOperation("Loading JSONEditors...", () => {
            settingsEditor = new JSONEditor(document.getElementById("settingsContainer"),{
                schema: mb_settingsSchema,
                theme: "html",
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
        new MB_AsyncLoadOperation("Loading performance manager...", () => {
            performanceManager = new MB_PerformanceManager({
                storageManager: storageManager,
                inputManager: inputManager,
                debugOverlay: document.getElementById("debugOverlay"),
            });
            homeCanvasManager = new MB_HomeCanvasManager(document.getElementById("homeScreen"), performanceManager);
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
}