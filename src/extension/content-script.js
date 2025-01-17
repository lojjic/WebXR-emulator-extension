const port = chrome.runtime.connect({name: 'contentScript'});

const dispatchCustomEvent = (type, detail) => {
  window.dispatchEvent(new CustomEvent(type, {
    detail: typeof cloneInto !== 'undefined' ? cloneInto(detail, window) : detail
  }));
};

// receive message from panel via background
// and transfer to polyfill as event on window

port.onMessage.addListener(message => {
  switch (message.action) {
    case 'webxr-device':
      dispatchCustomEvent('webxr-device', {
        deviceDefinition: message.deviceDefinition
      });
      break;

    case 'webxr-pose':
      dispatchCustomEvent('webxr-pose', {
        position: message.position,
        quaternion: message.quaternion
      });
      break;

    case 'webxr-input-pose':
      dispatchCustomEvent('webxr-input-pose', {
        objectName: message.objectName,
        position: message.position,
        quaternion: message.quaternion
      });
      break;

    case 'webxr-input-button':
      dispatchCustomEvent('webxr-input-button', {
        objectName: message.objectName,
        pressed: message.pressed,
        buttonIndex: message.buttonIndex
      });
      break;

    case 'webxr-stereo-effect':
      dispatchCustomEvent('webxr-stereo-effect', {
        enabled: message.enabled
      });
      break;

    case 'webxr-exit-immersive':
      dispatchCustomEvent('webxr-exit-immersive', {});
      break;
  }
});

// function to load script in a web page

const loadScript = source => {
  const script = document.createElement('script');
  script.textContent = source;
  (document.head || document.documentElement).appendChild(script);
  script.parentNode.removeChild(script);
};

// Synchronously adding WebXR polyfill because
// some applications for example Three.js WebVR examples
// check if WebXR is available by synchronously checking
// navigator.xr , window.XR or whatever when the page is loaded.

loadScript(`
  (function() {
    (` + WebXRPolyfillInjection + `)();
    const polyfill = new CustomWebXRPolyfill();
    //console.log(this); // to check if loaded
  })();
`);

// No synchronous storage and fetch APIs so reluctantly
// reflecting configuration asynchronously

ConfigurationManager.createFromJsonFile('src/devices.json').then(manager => {
  manager.loadFromStorage().then(() => {
    // send the configuration parameters to the polyfill as an event
    dispatchCustomEvent('webxr-device-init', {
      deviceDefinition: manager.deviceDefinition,
      stereoEffect: manager.stereoEffect
    });
    port.postMessage({
      action: 'webxr-startup'
    });
  });
}).catch(error => {
  console.error(error);
});
