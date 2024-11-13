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
  // is an object with these properties:
  //
  //   "name": the name of the function as a string
  //   "description: a string describing what the function does
  //   "parameters": a JSON schema listing the parameters to the function
  //   "callback": a function to be invoked when a model response invokes
  //               this function.
  functionDeclarations = [],

  // The initial system instructions, as a string.
  systemInstructions = undefined,

} = {}) {
  takeScreenshotCallback = screenshotCallback;

  const supportsScreenshot = screenshotCallback !== undefined;

  for (const f of functionDeclarations) {
    functionDeclarationsMap.set(f.name, f.callback);
    delete f.callback;
  }

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

  // The model to call. The model specified in init() will be used by default.
  model = undefined,

  // Whether to request model responses in JSON.
  // NOTE: Function Declarations are *always* disabled when JSON mode is enabled.
  jsonMode = false,

  // If jsonMode is true then this can be used to specify the JSON schema.
  jsonSchema = undefined,

  // The text string to send to the model, as as "user" turn. This is required.
  userText = undefined,

  // An optional "data:" URL with an image payload, to include with the user
  // turn.
  imageDataURL = undefined,

  // The list of Function Declarations that should be enabled in this call,
  // specified as a list of strings. Each string identifies one of the Function
  // Declarations passed to init().
  //
  // "undefined" sends ALL Function Declarations passed to init().
  // An empty list can be passed to disable all Function Declarations.
  enabledFunctions = undefined,

} = {}) {
  if (generateContentResolve) {
    throw new Error("Previous call to generateContent hasn't finished yet");
  }

  if (typeof userText !== 'string') {
    throw new Error('userText must be a string');
  }

  return new Promise((resolve) => {
    generateContentResolve = resolve;

    generateContentPendingRequestId = `${generateContentNextRequestId++}`;

    const message = {
      type: 'sendToModel',
      requestId: generateContentPendingRequestId,
      jsonMode,
      jsonSchema,
      userText,
      imageDataURL,
      enabledFunctions,
    };

    sendMessage(message);
  });
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

let generateContentPendingRequestId = '';
let generateContentNextRequestId = 0;
let generateContentResolve = null;

const functionDeclarationsMap = new Map();

function sendMessage(message) {
  if (aistudioOrigin) {
    window.parent.postMessage(message, aistudioOrigin);
  } else {
    throw new Error("init hasn't finished yet");
  }
}

function onModelResponse(requestId, text) {
  if (requestId !== generateContentPendingRequestId) {
    console.error(`Unexpected message from AI Studio for requestId ${requestId}`);
    return;
  }
  if (!generateContentResolve) {
    console.error('Unexpected model response from AI Studio');
    return;
  }
  generateContentPendingRequestId = '';
  const resolve = generateContentResolve;
  generateContentResolve = null;
  resolve(text);
}

function onFunctionCall(name, args) {
  const callback = functionDeclarationsMap.get(name);
  if (callback) {
    callback(args);
  } else {
    console.error(`Invalid model Function Call to unknown function "${name}"`);
  }
}

async function onMessage(event) {
  const data = event.data;

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
      onFunctionCall(data.name, data.args);
      break;

    case 'modelResponse':
      onModelResponse(data.requestId, data.text);
      break;

    default:
      console.log('Received unknown message from AI Studio:', data.type);
      console.dir(data);
      break;

  }
}

window.addEventListener('message', onMessage);

