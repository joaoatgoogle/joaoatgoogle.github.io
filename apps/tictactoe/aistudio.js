// The promise returned by this function resolves once AI Studio is connected.
// It's not possible to make other calls (like generateContent) until this
// connection is ready.
export async function init({

  // The default Gemini model to use in generateContent() requests.
  // A default model will be used if this value is invalid or not supported.
  model = 'models/gemini-1-5-flash-002',

  // A callback function that returns a Promise<string> with a data: URL
  // containing a screenshot of the current app state to send to the model.
  // Screenshots won't be used if this is set to undefined.
  screenshotCallback = undefined,

  // A list of function declarations that the model can invoke on this app.
  // generateContent() will include all of these by default, unless a subset
  // is specified in each generateContent() call. Each function declaration
  // is an object with a string "name", a string "description", and a JSON
  // Schema list of "parameters" to that function.
  functionDeclarations = [],

  // The initial system instructions, as a string.
  systemInstructions = undefined,

} = {}) {
  takeScreenshotCallback = screenshotCallback;

  const supportsScreenshot = screenshotCallback !== undefined;

  initData = {
    type: 'init',
    model,
    supportsScreenshot,
    functionDeclarations,
    systemInstructions,
  };

  if (aistudioOrigin) {
    sendMessage(initData);
    initData = null;
  } else {
    return new Promise((resolve) => {
      initResolve = resolve;
    });
  }
}


// Sends a chat message to the chat view.
// These messages are not visible to Gemini.
export function chat(text) {
  sendMessage({type: 'chat', text});
}


// Clears the chat history.
export function clearChat() {
  sendMessage({type: 'clearChat'});
}


// Sets the System Instructions.
export function setSystemInstructions(systemInstructions) {
  sendMessage({type: 'setSystemInstructions', systemInstructions});
}


// Calls Gemini.
//
// This function returns a Promise that resolves once a response is received
// from the model.
//
// It's not possible to make further calls until the previous call has finished.
//
// The Promise resolves to a string with the model's response.
export async function generateContent({
}) {
  // TODO: here
}


///////////////////////////////
//                           //
//  Implementation details.  //
//                           //
///////////////////////////////

let aistudioOrigin = '';

let initData = null;
let initResolve = null;

let takeScreenshotCallback = null;

function sendMessage(message) {
  if (aistudioOrigin) {
    window.parent.postMessage(message, aistudioOrigin);
  } else {
    throw new Error("init hasn't finished yet");
  }
}

async function onMessage(event) {
  const data = event.data;

  console.log('-- Received message from AI Studio:', data.type);

  switch (data.type) {

    case 'init':
      aistudioOrigin = event.origin;
      if (initData) {
        sendMessage(initData);
        initData = null;
        if (initResolve) {
          initResolve();
          initResolve = null;
        }
      }
      break;

    case 'screenshot':
      const dataURL = await takeScreenshotCallback();
      sendMessage({type: 'screenshot', dataURL});
      break;

    case 'functionCall':
      // handleFunctionCall(data.name, data.args);
      break;

    default:
      // console.log('Received unknown message from AI Studio:', data.type);
      // console.dir(data);
      break;

  }
}

window.addEventListener('message', onMessage);

