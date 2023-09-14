
import {
  ObjectDetector,
  FilesetResolver,
} from "@mediapipe/tasks-vision";

const demosSection = document.getElementById("demos");

let objectDetector;
let runningMode = "VIDEO";

// Initialize the object detector
const initializeObjectDetector = async () => {
  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.2/wasm"
  );
  objectDetector = await ObjectDetector.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: './efficientdet_lite0.tflite',
      delegate: "CPU"
    },

    scoreThreshold: 0.5,
    runningMode: runningMode
  });
  demosSection.classList.remove("invisible");
};
initializeObjectDetector();


let video = document.getElementById("webcam");
const liveView = document.getElementById("liveView");
let enableWebcamButton;
// Check if webcam access is supported.
function hasGetUserMedia() {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}

const children = [];

// If webcam supported, add event listener to button for when user
// wants to activate it.
if (hasGetUserMedia()) {
  enableWebcamButton = document.getElementById("webcamButton");
  enableWebcamButton.addEventListener("click", enableCam);
} else {
  console.warn("getUserMedia() is not supported by your browser");
}

// Enable the live webcam view and start detection.
async function enableCam(event) {
  if (!objectDetector) {
    console.log("Wait! objectDetector not loaded yet.");
    return;
  }

  // Hide the button.
  enableWebcamButton.classList.add("removed");

  // getUsermedia parameters
  const constraints = {
    video: { facingMode: { ideal: 'environment' } }
  };

  // Activate the webcam stream.
  navigator.mediaDevices
    .getUserMedia(constraints)
    .then(function (stream) {
      video.srcObject = stream;
      video.addEventListener("loadeddata", () => {
        // video.style.transform = "scaleX(-1)";
        predictWebcam();});
    })
    .catch((err) => {
      console.error(err);
      /* handle the error */
    });
}

let lastVideoTime = -1;
async function predictWebcam() {
  // if image mode is initialized, create a new classifier with video runningMode.
  if (runningMode === "IMAGE") {
    runningMode = "VIDEO";
    await objectDetector.setOptions({ runningMode: "VIDEO" });
  }
  let startTimeMs = performance.now();

  // Detect objects using detectForVideo.
  if (video.currentTime !== lastVideoTime) {
    lastVideoTime = video.currentTime;
    const detections = objectDetector.detectForVideo(video, startTimeMs);
    displayVideoDetections(detections);
  }

  // video.style.transform = "scaleX(-1)"
  // Call this function again to keep predicting when the browser is ready.
  window.requestAnimationFrame(predictWebcam);
}



function displayVideoDetections(result) {
  // Remove any highlighting from the previous frame.
  for (let child of children) {
    liveView.removeChild(child);
  }
  children.splice(0);

  // Iterate through predictions and draw them to the live view
  for (let detection of result.detections) {
    // debugger
    const p = document.createElement('p');
    p.innerText =
      detection.categories[0].categoryName +
      ' - with ' +
      Math.round(parseFloat(detection.categories[0].score) * 100) +
      '% confidence.';
    p.style =
      'right: ' +
      ((video.offsetWidth +
        detection.boundingBox.width +
        detection.boundingBox.originX) * -1) +
      'px;' +
      'top: ' +
      detection.boundingBox.originY +
      'px; ' +
      'width: ' +
      (detection.boundingBox.width - 10) +
      'px;' ;

    const highlighter = document.createElement('div');
    highlighter.setAttribute('class', 'highlighter');
    highlighter.style =
      'right: ' +
      ((video.offsetWidth +
        detection.boundingBox.width +
        detection.boundingBox.originX) * -1) +
      'px;' +
      'top: ' +
      detection.boundingBox.originY +
      'px;' +
      'width: ' +
      (detection.boundingBox.width - 10) +
      'px;' +
      'height: ' +
      detection.boundingBox.height +
      'px;';

    liveView.appendChild(highlighter);
    liveView.appendChild(p);

    // Store drawn objects in memory so they are queued to delete at the next call.
    children.push(highlighter);
    children.push(p);
  }
}