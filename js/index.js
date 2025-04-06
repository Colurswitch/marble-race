import { MB_AsyncLoadOperation, MB_AsyncLoadController } from "/js/asyncLoadingController.js";

const asyncLoadController = new MB_AsyncLoadController({
    loadingScreen: document.getElementById("loading-screen"),
})