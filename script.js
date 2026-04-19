const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");
const statusBox = document.getElementById("status");
const messagesBox = document.getElementById("messages");
const chatInput = document.getElementById("chatInput");
const sendBtn = document.getElementById("sendBtn");
const emojiBtn = document.getElementById("emojiBtn");
const emojiBox = document.getElementById("emojiBox");
const muteBtn = document.getElementById("muteBtn");
const cameraBtn = document.getElementById("cameraBtn");
const endCallBtn = document.getElementById("endCallBtn");
const fullscreenLocalBtn = document.getElementById("fullscreenLocalBtn");
const fullscreenRemoteBtn = document.getElementById("fullscreenRemoteBtn");
const usernameInput = document.getElementById("username");
const saveNameBtn = document.getElementById("saveNameBtn");
const localLabel = document.getElementById("localLabel");
const remoteLabel = document.getElementById("remoteLabel");
const roomId = document.getElementById("roomId");
const darkModeBtn = document.getElementById("darkModeBtn");

const localAvatarOverlay = document.getElementById("localAvatarOverlay");
const remoteAvatarOverlay = document.getElementById("remoteAvatarOverlay");
const localAvatarCircle = document.getElementById("localAvatarCircle");
const remoteAvatarCircle = document.getElementById("remoteAvatarCircle");
const localAvatarName = document.getElementById("localAvatarName");
const remoteAvatarName = document.getElementById("remoteAvatarName");

const incomingCallPopup = document.getElementById("incomingCallPopup");
const incomingCallerName = document.getElementById("incomingCallerName");
const popupAvatar = document.getElementById("popupAvatar");
const acceptCallBtn = document.getElementById("acceptCallBtn");
const rejectCallBtn = document.getElementById("rejectCallBtn");

const msgSound = new Audio("https://notificationsounds.com/storage/sounds/file-sounds-1150-pristine.mp3");
let unreadCount = 0;
let blinkInterval = null;

let localStream = null;
let pc = null;
let room = null;
let dataChannel = null;
let roomDataListenerAttached = false;
let myName = "You";
let remoteName = "Remote User";
let pendingOffer = null;
let pendingCandidates = [];
let localTracksAdded = false;
let hasAcceptedCall = false;
let popupShown = false;

msgSound.volume = 1;

if (!location.hash) {
  location.hash = Math.floor(Math.random() * 0xffffff).toString(16);
}

const roomHash = location.hash.substring(1);
roomId.textContent = roomHash;

const roomName = "observable-" + roomHash;
const drone = new ScaleDrone("y0N6q0oVsjY9fEiu");

const configuration = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
};

function setStatus(text) {
  statusBox.textContent = text;
}

let soundEnabled = false;

document.addEventListener("click", () => {
  if (!soundEnabled) {
    msgSound.play().then(() => {
      msgSound.pause();
      msgSound.currentTime = 0;
      soundEnabled = true;
      console.log("Sound unlocked");
    }).catch(() => {});
  }
});

function onError(error) {
  console.error(error);
  const msg = error && error.message ? error.message : "Unknown error";
  setStatus("Error: " + msg);
}

function startBlinking() {
  if (blinkInterval) return;

  blinkInterval = setInterval(() => {
    document.title =
      document.title === "New Message 🔔"
        ? "Video Calling App"
        : "New Message 🔔";
  }, 1000);
}

function stopBlinking() {
  clearInterval(blinkInterval);
  blinkInterval = null;
}

function sendSignalMessage(message) {
  drone.publish({
    room: roomName,
    message: message
  });
}

function getInitial(name) {
  if (!name || !name.trim()) return "U";
  return name.trim().charAt(0).toUpperCase();
}

function updateAvatarViews() {
  localAvatarCircle.textContent = getInitial(myName);
  remoteAvatarCircle.textContent = getInitial(remoteName);
  popupAvatar.textContent = getInitial(remoteName);

  localAvatarName.textContent = myName;
  remoteAvatarName.textContent = remoteName;
}

function showLocalAvatar(show) {
  if (show) {
    localAvatarOverlay.classList.add("show");
  } else {
    localAvatarOverlay.classList.remove("show");
  }
}

function showRemoteAvatar(show) {
  if (show) {
    remoteAvatarOverlay.classList.add("show");
  } else {
    remoteAvatarOverlay.classList.remove("show");
  }
}

function toggleDarkMode() {
  document.body.classList.toggle("dark");
  const isDark = document.body.classList.contains("dark");
  darkModeBtn.textContent = isDark ? "Light Mode" : "Dark Mode";
  localStorage.setItem("video_app_dark_mode", isDark ? "on" : "off");
}

function loadDarkModePreference() {
  const saved = localStorage.getItem("video_app_dark_mode");
  if (saved === "on") {
    document.body.classList.add("dark");
    darkModeBtn.textContent = "Light Mode";
  }
}

async function initMedia() {
  try {
    localStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: true
    });

    localVideo.srcObject = localStream;
    showLocalAvatar(false);
    setStatus("Camera and microphone connected");
  } catch (error) {
    onError(error);
  }
}

function addMessage(text, type, senderName) {
  const div = document.createElement("div");
  div.className = "message " + type;

  const content = document.createElement("div");
  content.textContent = text;

  const meta = document.createElement("span");
  meta.className = "meta";
  meta.textContent =
    senderName +
    " • " +
    new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit"
    });

  div.appendChild(content);
  div.appendChild(meta);
  messagesBox.appendChild(div);
  messagesBox.scrollTop = messagesBox.scrollHeight;
}

// function setupDataChannel(channel) {
//   dataChannel = channel;

//   dataChannel.onopen = function () {
//     setStatus("Chat connected");
//     sendChatSystemData({ type: "name", name: myName });
//     sendChatSystemData({
//       type: "camera-status",
//       cameraOff: !isLocalCameraEnabled()
//     });
//   };

//   dataChannel.onclose = function () {
//     setStatus("Chat disconnected");
//   };

//   dataChannel.onerror = function (error) {
//     console.error("Data channel error:", error);
//   };

//   dataChannel.onmessage = function (event) {
//     try {
//       const data = JSON.parse(event.data);

//       if (data.type === "chat") {
//         addMessage(data.text, "remote", data.name || "Remote User");
//       } else if (data.type === "name") {
//         remoteName = data.name || "Remote User";
//         remoteLabel.textContent = remoteName;
//         updateAvatarViews();
//       } else if (data.type === "camera-status") {
//         showRemoteAvatar(!!data.cameraOff);
//       }
//     } catch (error) {
//       addMessage(event.data, "remote", "Remote User");
//     }
//   };
// }

function setupDataChannel(channel) {
  dataChannel = channel;

  dataChannel.onopen = function () {
    setStatus("Chat connected");

    sendChatSystemData({
      type: "name",
      name: myName
    });

    sendChatSystemData({
      type: "camera-status",
      cameraOff: !isLocalCameraEnabled()
    });
  };

  dataChannel.onclose = function () {
    setStatus("Chat disconnected");
  };

  dataChannel.onerror = function (error) {
    console.error("Data channel error:", error);
  };

  dataChannel.onmessage = function (event) {
    try {
      const data = JSON.parse(event.data);

      if (data.type === "chat") {
        addMessage(data.text, "remote", data.name || "Remote User");

        // Notification sound
        if (typeof msgSound !== "undefined") {
          // msgSound.play().catch(() => {});
          if (soundEnabled) {
  msgSound.currentTime = 0;
  msgSound.play().catch(() => {});
}
        }

        // Unread badge + blinking title
        if (document.hidden) {
          unreadCount++;

          document.title = `(${unreadCount}) New Messages`;

          if (typeof startBlinking === "function") {
            startBlinking();
          }
        }
      } 
      else if (data.type === "name") {
        remoteName = data.name || "Remote User";
        remoteLabel.textContent = remoteName;

        if (typeof updateAvatarViews === "function") {
          updateAvatarViews();
        }
      } 
      else if (data.type === "camera-status") {
        if (typeof showRemoteAvatar === "function") {
          showRemoteAvatar(!!data.cameraOff);
        }
      }
    } catch (error) {
      addMessage(event.data, "remote", "Remote User");

      // Fallback notification for non-JSON message
      if (typeof msgSound !== "undefined") {
        // msgSound.play().catch(() => {});
        if (soundEnabled) {
  msgSound.currentTime = 0;
  msgSound.play().catch(() => {});
}
      }

      if (document.hidden) {
        unreadCount++;
        document.title = `(${unreadCount}) New Messages`;

        if (typeof startBlinking === "function") {
          startBlinking();
        }
      }
    }
  };
}

function sendChatSystemData(payload) {
  if (!dataChannel || dataChannel.readyState !== "open") return;
  dataChannel.send(JSON.stringify(payload));
}

function attachRoomDataListener() {
  if (roomDataListenerAttached) return;
  roomDataListenerAttached = true;

  room.on("data", async (message, client) => {
    if (client.id === drone.clientId) return;

    try {
      if (message.callRequest) {
        remoteName = message.name || "Remote User";
        updateAvatarViews();
        incomingCallerName.textContent = remoteName + " is calling...";
        if (!popupShown) {
          incomingCallPopup.classList.remove("hidden");
          popupShown = true;
          setStatus("Incoming call...");
        }
        return;
      }

      if (message.callRejected) {
        setStatus("Call rejected by remote user");
        return;
      }

      if (message.sdp) {
        if (!pc) {
          pendingOffer = message.sdp;
          return;
        }

        if (!hasAcceptedCall && message.sdp.type === "offer") {
          pendingOffer = message.sdp;
          return;
        }

        await pc.setRemoteDescription(new RTCSessionDescription(message.sdp));

        if (message.sdp.type === "offer") {
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          sendSignalMessage({ sdp: pc.localDescription });

          while (pendingCandidates.length) {
            const candidate = pendingCandidates.shift();
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          }
        }
      } else if (message.candidate) {
        if (!pc || !pc.remoteDescription) {
          pendingCandidates.push(message.candidate);
          return;
        }

        await pc.addIceCandidate(new RTCIceCandidate(message.candidate));
      }
    } catch (error) {
      onError(error);
    }
  });
}

function addLocalTracksOnce() {
  if (!pc || !localStream || localTracksAdded) return;

  localStream.getTracks().forEach((track) => {
    pc.addTrack(track, localStream);
  });

  localTracksAdded = true;
}

function createPeerConnection(isOfferer) {
  pc = new RTCPeerConnection(configuration);
  localTracksAdded = false;

  pc.onicecandidate = function (event) {
    if (event.candidate) {
      sendSignalMessage({ candidate: event.candidate });
    }
  };

  pc.ontrack = function (event) {
    if (event.streams && event.streams[0]) {
      remoteVideo.srcObject = event.streams[0];
      setStatus("Video call connected");
    }
  };

  pc.onconnectionstatechange = function () {
    if (pc && pc.connectionState) {
      setStatus("Connection state: " + pc.connectionState);
    }
  };

  addLocalTracksOnce();

  if (isOfferer) {
    const chatChannel = pc.createDataChannel("chat");
    setupDataChannel(chatChannel);

    pc.onnegotiationneeded = async function () {
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        sendSignalMessage({ sdp: pc.localDescription });
      } catch (error) {
        onError(error);
      }
    };
  } else {
    pc.ondatachannel = function (event) {
      setupDataChannel(event.channel);
    };
  }

  attachRoomDataListener();
}

function sendChatMessage() {
  const text = chatInput.value.trim();

  if (!text) return;

  if (!dataChannel || dataChannel.readyState !== "open") {
    alert("Chat is not connected yet.");
    return;
  }

  const payload = {
    type: "chat",
    text: text,
    name: myName
  };

  dataChannel.send(JSON.stringify(payload));
  addMessage(text, "self", myName);
  chatInput.value = "";
  chatInput.focus();
}

function makeFullScreen(video) {
  if (video.requestFullscreen) {
    video.requestFullscreen();
  } else if (video.webkitRequestFullscreen) {
    video.webkitRequestFullscreen();
  } else if (video.msRequestFullscreen) {
    video.msRequestFullscreen();
  }
}

function isLocalCameraEnabled() {
  if (!localStream) return false;
  const videoTracks = localStream.getVideoTracks();
  if (!videoTracks.length) return false;
  return videoTracks[0].enabled;
}

function toggleMute() {
  if (!localStream) return;

  const audioTracks = localStream.getAudioTracks();
  if (!audioTracks.length) return;

  audioTracks.forEach((track) => {
    track.enabled = !track.enabled;
  });

  const isMuted = !audioTracks[0].enabled;
  muteBtn.textContent = isMuted ? "Unmute" : "Mute";
}

function toggleCamera() {
  if (!localStream) return;

  const videoTracks = localStream.getVideoTracks();
  if (!videoTracks.length) return;

  videoTracks.forEach((track) => {
    track.enabled = !track.enabled;
  });

  const isOff = !videoTracks[0].enabled;
  cameraBtn.textContent = isOff ? "Camera On" : "Camera Off";

  showLocalAvatar(isOff);
  sendChatSystemData({
    type: "camera-status",
    cameraOff: isOff
  });
}

function endCall() {
  try {
    if (dataChannel) {
      dataChannel.close();
      dataChannel = null;
    }

    if (pc) {
      pc.close();
      pc = null;
    }

    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
    }

    localVideo.srcObject = null;
    remoteVideo.srcObject = null;
    showLocalAvatar(true);
    showRemoteAvatar(true);
    setStatus("Call ended");
  } catch (error) {
    onError(error);
  }
}

function startOutgoingCall() {
  sendSignalMessage({
    callRequest: true,
    name: myName
  });
}

async function acceptIncomingCall() {
  incomingCallPopup.classList.add("hidden");
  popupShown = false;
  hasAcceptedCall = true;

  if (!pc) {
    createPeerConnection(false);
  }

  if (pendingOffer) {
    await pc.setRemoteDescription(new RTCSessionDescription(pendingOffer));

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    sendSignalMessage({ sdp: pc.localDescription });
    pendingOffer = null;
  }

  while (pendingCandidates.length && pc.remoteDescription) {
    const candidate = pendingCandidates.shift();
    await pc.addIceCandidate(new RTCIceCandidate(candidate));
  }

  setStatus("Call accepted");
}

function rejectIncomingCall() {
  incomingCallPopup.classList.add("hidden");
  popupShown = false;
  sendSignalMessage({ callRejected: true });
  setStatus("Call rejected");
}

saveNameBtn.addEventListener("click", function () {
  const value = usernameInput.value.trim();
  if (!value) return;

  myName = value;
  localLabel.textContent = myName + " (You)";
  updateAvatarViews();
  sendChatSystemData({
    type: "name",
    name: myName
  });
});

sendBtn.addEventListener("click", sendChatMessage);

chatInput.addEventListener("keydown", function (e) {
  if (e.key === "Enter") {
    sendChatMessage();
  }
});

emojiBtn.addEventListener("click", function () {
  emojiBox.style.display = emojiBox.style.display === "flex" ? "none" : "flex";
});

document.querySelectorAll(".emoji").forEach((emoji) => {
  emoji.addEventListener("click", function () {
    chatInput.value += emoji.textContent;
    chatInput.focus();
  });
});

document.addEventListener("visibilitychange", () => {
  if (!document.hidden) {
    unreadCount = 0;
    document.title = "MeetNova";

    stopBlinking();
  }
});

muteBtn.addEventListener("click", toggleMute);
cameraBtn.addEventListener("click", toggleCamera);
endCallBtn.addEventListener("click", endCall);
fullscreenLocalBtn.addEventListener("click", function () {
  makeFullScreen(localVideo);
});
fullscreenRemoteBtn.addEventListener("click", function () {
  makeFullScreen(remoteVideo);
});
darkModeBtn.addEventListener("click", toggleDarkMode);
acceptCallBtn.addEventListener("click", function () {
  acceptIncomingCall().catch(onError);
});
rejectCallBtn.addEventListener("click", rejectIncomingCall);

localVideo.addEventListener("click", function () {
  makeFullScreen(localVideo);
});

remoteVideo.addEventListener("click", function () {
  makeFullScreen(remoteVideo);
});

async function startApp() {
  loadDarkModePreference();
  updateAvatarViews();
  showRemoteAvatar(true);

  await initMedia();

  drone.on("open", function (error) {
    if (error) {
      onError(error);
      return;
    }

    room = drone.subscribe(roomName);

    room.on("open", function (error) {
      if (error) {
        onError(error);
      }
    });

    room.on("members", function (members) {
      if (members.length > 2) {
        setStatus("Room full. Only 2 users allowed.");
        return;
      }

      attachRoomDataListener();

      if (members.length === 2) {
        hasAcceptedCall = true;
        createPeerConnection(true);
        startOutgoingCall();
      } else {
        setStatus("Waiting for another user to join...");
      }
    });
  });
}

startApp();










// const localVideo = document.getElementById("localVideo");
// const remoteVideo = document.getElementById("remoteVideo");
// const statusBox = document.getElementById("status");
// const messagesBox = document.getElementById("messages");
// const chatInput = document.getElementById("chatInput");
// const sendBtn = document.getElementById("sendBtn");
// const emojiBtn = document.getElementById("emojiBtn");
// const emojiBox = document.getElementById("emojiBox");
// const muteBtn = document.getElementById("muteBtn");
// const cameraBtn = document.getElementById("cameraBtn");
// const endCallBtn = document.getElementById("endCallBtn");
// const fullscreenLocalBtn = document.getElementById("fullscreenLocalBtn");
// const fullscreenRemoteBtn = document.getElementById("fullscreenRemoteBtn");
// const usernameInput = document.getElementById("username");
// const saveNameBtn = document.getElementById("saveNameBtn");
// const localLabel = document.getElementById("localLabel");
// const remoteLabel = document.getElementById("remoteLabel");
// const roomId = document.getElementById("roomId");
// const darkModeBtn = document.getElementById("darkModeBtn");

// const localAvatarOverlay = document.getElementById("localAvatarOverlay");
// const remoteAvatarOverlay = document.getElementById("remoteAvatarOverlay");
// const localAvatarCircle = document.getElementById("localAvatarCircle");
// const remoteAvatarCircle = document.getElementById("remoteAvatarCircle");
// const localAvatarName = document.getElementById("localAvatarName");
// const remoteAvatarName = document.getElementById("remoteAvatarName");

// const incomingCallPopup = document.getElementById("incomingCallPopup");
// const incomingCallerName = document.getElementById("incomingCallerName");
// const popupAvatar = document.getElementById("popupAvatar");
// const acceptCallBtn = document.getElementById("acceptCallBtn");
// const rejectCallBtn = document.getElementById("rejectCallBtn");

// let localStream = null;
// let pc = null;
// let room = null;
// let dataChannel = null;
// let roomDataListenerAttached = false;
// let myName = "You";
// let remoteName = "Remote User";
// let pendingOffer = null;
// let pendingCandidates = [];
// let localTracksAdded = false;
// let hasAcceptedCall = false;
// let popupShown = false;

// if (!location.hash) {
//   location.hash = Math.floor(Math.random() * 0xffffff).toString(16);
// }

// const roomHash = location.hash.substring(1);
// roomId.textContent = roomHash;

// const roomName = "observable-" + roomHash;
// const drone = new ScaleDrone("y0N6q0oVsjY9fEiu");

// const configuration = {
//   iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
// };

// function setStatus(text) {
//   statusBox.textContent = text;
// }

// function onError(error) {
//   console.error(error);
//   const msg = error && error.message ? error.message : "Unknown error";
//   setStatus("Error: " + msg);
// }

// function sendSignalMessage(message) {
//   drone.publish({
//     room: roomName,
//     message: message
//   });
// }

// function getInitial(name) {
//   if (!name || !name.trim()) return "U";
//   return name.trim().charAt(0).toUpperCase();
// }

// function updateAvatarViews() {
//   localAvatarCircle.textContent = getInitial(myName);
//   remoteAvatarCircle.textContent = getInitial(remoteName);
//   popupAvatar.textContent = getInitial(remoteName);

//   localAvatarName.textContent = myName;
//   remoteAvatarName.textContent = remoteName;
// }

// function showLocalAvatar(show) {
//   if (show) {
//     localAvatarOverlay.classList.add("show");
//   } else {
//     localAvatarOverlay.classList.remove("show");
//   }
// }

// function showRemoteAvatar(show) {
//   if (show) {
//     remoteAvatarOverlay.classList.add("show");
//   } else {
//     remoteAvatarOverlay.classList.remove("show");
//   }
// }

// function toggleDarkMode() {
//   document.body.classList.toggle("dark");
//   const isDark = document.body.classList.contains("dark");
//   darkModeBtn.textContent = isDark ? "Light Mode" : "Dark Mode";
//   localStorage.setItem("video_app_dark_mode", isDark ? "on" : "off");
// }

// function loadDarkModePreference() {
//   const saved = localStorage.getItem("video_app_dark_mode");
//   if (saved === "on") {
//     document.body.classList.add("dark");
//     darkModeBtn.textContent = "Light Mode";
//   }
// }

// async function initMedia() {
//   try {
//     localStream = await navigator.mediaDevices.getUserMedia({
//       audio: true,
//       video: true
//     });

//     localVideo.srcObject = localStream;
//     showLocalAvatar(false);
//     setStatus("Camera and microphone connected");
//   } catch (error) {
//     onError(error);
//   }
// }

// function addMessage(text, type, senderName) {
//   const div = document.createElement("div");
//   div.className = "message " + type;

//   const content = document.createElement("div");
//   content.textContent = text;

//   const meta = document.createElement("span");
//   meta.className = "meta";
//   meta.textContent =
//     senderName +
//     " • " +
//     new Date().toLocaleTimeString([], {
//       hour: "2-digit",
//       minute: "2-digit"
//     });

//   div.appendChild(content);
//   div.appendChild(meta);
//   messagesBox.appendChild(div);
//   messagesBox.scrollTop = messagesBox.scrollHeight;
// }

// function setupDataChannel(channel) {
//   dataChannel = channel;

//   dataChannel.onopen = function () {
//     setStatus("Chat connected");
//     sendChatSystemData({ type: "name", name: myName });
//     sendChatSystemData({
//       type: "camera-status",
//       cameraOff: !isLocalCameraEnabled()
//     });
//   };

//   dataChannel.onclose = function () {
//     setStatus("Chat disconnected");
//   };

//   dataChannel.onerror = function (error) {
//     console.error("Data channel error:", error);
//   };

//   dataChannel.onmessage = function (event) {
//     try {
//       const data = JSON.parse(event.data);

//       if (data.type === "chat") {
//         addMessage(data.text, "remote", data.name || "Remote User");
//       } else if (data.type === "name") {
//         remoteName = data.name || "Remote User";
//         remoteLabel.textContent = remoteName;
//         updateAvatarViews();
//       } else if (data.type === "camera-status") {
//         showRemoteAvatar(!!data.cameraOff);
//       }
//     } catch (error) {
//       addMessage(event.data, "remote", "Remote User");
//     }
//   };
// }

// function sendChatSystemData(payload) {
//   if (!dataChannel || dataChannel.readyState !== "open") return;
//   dataChannel.send(JSON.stringify(payload));
// }

// function attachRoomDataListener() {
//   if (roomDataListenerAttached) return;
//   roomDataListenerAttached = true;

//   room.on("data", async (message, client) => {
//     if (client.id === drone.clientId) return;

//     try {
//       if (message.callRequest) {
//         remoteName = message.name || "Remote User";
//         updateAvatarViews();
//         incomingCallerName.textContent = remoteName + " is calling...";
//         if (!popupShown) {
//           incomingCallPopup.classList.remove("hidden");
//           popupShown = true;
//           setStatus("Incoming call...");
//         }
//         return;
//       }

//       if (message.callRejected) {
//         setStatus("Call rejected by remote user");
//         return;
//       }

//       if (message.sdp) {
//         if (!pc) {
//           pendingOffer = message.sdp;
//           return;
//         }

//         if (!hasAcceptedCall && message.sdp.type === "offer") {
//           pendingOffer = message.sdp;
//           return;
//         }

//         await pc.setRemoteDescription(new RTCSessionDescription(message.sdp));

//         if (message.sdp.type === "offer") {
//           const answer = await pc.createAnswer();
//           await pc.setLocalDescription(answer);
//           sendSignalMessage({ sdp: pc.localDescription });

//           while (pendingCandidates.length) {
//             const candidate = pendingCandidates.shift();
//             await pc.addIceCandidate(new RTCIceCandidate(candidate));
//           }
//         }
//       } else if (message.candidate) {
//         if (!pc || !pc.remoteDescription) {
//           pendingCandidates.push(message.candidate);
//           return;
//         }

//         await pc.addIceCandidate(new RTCIceCandidate(message.candidate));
//       }
//     } catch (error) {
//       onError(error);
//     }
//   });
// }

// function addLocalTracksOnce() {
//   if (!pc || !localStream || localTracksAdded) return;

//   localStream.getTracks().forEach((track) => {
//     pc.addTrack(track, localStream);
//   });

//   localTracksAdded = true;
// }

// function createPeerConnection(isOfferer) {
//   pc = new RTCPeerConnection(configuration);
//   localTracksAdded = false;

//   pc.onicecandidate = function (event) {
//     if (event.candidate) {
//       sendSignalMessage({ candidate: event.candidate });
//     }
//   };

//   pc.ontrack = function (event) {
//     if (event.streams && event.streams[0]) {
//       remoteVideo.srcObject = event.streams[0];
//       setStatus("Video call connected");
//     }
//   };

//   pc.onconnectionstatechange = function () {
//     if (pc && pc.connectionState) {
//       setStatus("Connection state: " + pc.connectionState);
//     }
//   };

//   addLocalTracksOnce();

//   if (isOfferer) {
//     const chatChannel = pc.createDataChannel("chat");
//     setupDataChannel(chatChannel);

//     pc.onnegotiationneeded = async function () {
//       try {
//         const offer = await pc.createOffer();
//         await pc.setLocalDescription(offer);
//         sendSignalMessage({ sdp: pc.localDescription });
//       } catch (error) {
//         onError(error);
//       }
//     };
//   } else {
//     pc.ondatachannel = function (event) {
//       setupDataChannel(event.channel);
//     };
//   }

//   attachRoomDataListener();
// }

// function sendChatMessage() {
//   const text = chatInput.value.trim();

//   if (!text) return;

//   if (!dataChannel || dataChannel.readyState !== "open") {
//     alert("Chat is not connected yet.");
//     return;
//   }

//   const payload = {
//     type: "chat",
//     text: text,
//     name: myName
//   };

//   dataChannel.send(JSON.stringify(payload));
//   addMessage(text, "self", myName);
//   chatInput.value = "";
//   chatInput.focus();
// }

// function makeFullScreen(video) {
//   if (video.requestFullscreen) {
//     video.requestFullscreen();
//   } else if (video.webkitRequestFullscreen) {
//     video.webkitRequestFullscreen();
//   } else if (video.msRequestFullscreen) {
//     video.msRequestFullscreen();
//   }
// }

// function isLocalCameraEnabled() {
//   if (!localStream) return false;
//   const videoTracks = localStream.getVideoTracks();
//   if (!videoTracks.length) return false;
//   return videoTracks[0].enabled;
// }

// function toggleMute() {
//   if (!localStream) return;

//   const audioTracks = localStream.getAudioTracks();
//   if (!audioTracks.length) return;

//   audioTracks.forEach((track) => {
//     track.enabled = !track.enabled;
//   });

//   const isMuted = !audioTracks[0].enabled;
//   muteBtn.textContent = isMuted ? "Unmute" : "Mute";
// }

// function toggleCamera() {
//   if (!localStream) return;

//   const videoTracks = localStream.getVideoTracks();
//   if (!videoTracks.length) return;

//   videoTracks.forEach((track) => {
//     track.enabled = !track.enabled;
//   });

//   const isOff = !videoTracks[0].enabled;
//   cameraBtn.textContent = isOff ? "Camera On" : "Camera Off";

//   showLocalAvatar(isOff);
//   sendChatSystemData({
//     type: "camera-status",
//     cameraOff: isOff
//   });
// }

// function endCall() {
//   try {
//     if (dataChannel) {
//       dataChannel.close();
//       dataChannel = null;
//     }

//     if (pc) {
//       pc.close();
//       pc = null;
//     }

//     if (localStream) {
//       localStream.getTracks().forEach((track) => track.stop());
//     }

//     localVideo.srcObject = null;
//     remoteVideo.srcObject = null;
//     showLocalAvatar(true);
//     showRemoteAvatar(true);
//     setStatus("Call ended");
//   } catch (error) {
//     onError(error);
//   }
// }

// function startOutgoingCall() {
//   sendSignalMessage({
//     callRequest: true,
//     name: myName
//   });
// }

// async function acceptIncomingCall() {
//   incomingCallPopup.classList.add("hidden");
//   popupShown = false;
//   hasAcceptedCall = true;

//   if (!pc) {
//     createPeerConnection(false);
//   }

//   if (pendingOffer) {
//     await pc.setRemoteDescription(new RTCSessionDescription(pendingOffer));

//     const answer = await pc.createAnswer();
//     await pc.setLocalDescription(answer);
//     sendSignalMessage({ sdp: pc.localDescription });
//     pendingOffer = null;
//   }

//   while (pendingCandidates.length && pc.remoteDescription) {
//     const candidate = pendingCandidates.shift();
//     await pc.addIceCandidate(new RTCIceCandidate(candidate));
//   }

//   setStatus("Call accepted");
// }

// function rejectIncomingCall() {
//   incomingCallPopup.classList.add("hidden");
//   popupShown = false;
//   sendSignalMessage({ callRejected: true });
//   setStatus("Call rejected");
// }

// saveNameBtn.addEventListener("click", function () {
//   const value = usernameInput.value.trim();
//   if (!value) return;

//   myName = value;
//   localLabel.textContent = myName + " (You)";
//   updateAvatarViews();
//   sendChatSystemData({
//     type: "name",
//     name: myName
//   });
// });

// sendBtn.addEventListener("click", sendChatMessage);

// chatInput.addEventListener("keydown", function (e) {
//   if (e.key === "Enter") {
//     sendChatMessage();
//   }
// });

// emojiBtn.addEventListener("click", function () {
//   emojiBox.style.display = emojiBox.style.display === "flex" ? "none" : "flex";
// });

// document.querySelectorAll(".emoji").forEach((emoji) => {
//   emoji.addEventListener("click", function () {
//     chatInput.value += emoji.textContent;
//     chatInput.focus();
//   });
// });

// muteBtn.addEventListener("click", toggleMute);
// cameraBtn.addEventListener("click", toggleCamera);
// endCallBtn.addEventListener("click", endCall);
// fullscreenLocalBtn.addEventListener("click", function () {
//   makeFullScreen(localVideo);
// });
// fullscreenRemoteBtn.addEventListener("click", function () {
//   makeFullScreen(remoteVideo);
// });
// darkModeBtn.addEventListener("click", toggleDarkMode);
// acceptCallBtn.addEventListener("click", function () {
//   acceptIncomingCall().catch(onError);
// });
// rejectCallBtn.addEventListener("click", rejectIncomingCall);

// localVideo.addEventListener("click", function () {
//   makeFullScreen(localVideo);
// });

// remoteVideo.addEventListener("click", function () {
//   makeFullScreen(remoteVideo);
// });

// async function startApp() {
//   loadDarkModePreference();
//   updateAvatarViews();
//   showRemoteAvatar(true);

//   await initMedia();

//   drone.on("open", function (error) {
//     if (error) {
//       onError(error);
//       return;
//     }

//     room = drone.subscribe(roomName);

//     room.on("open", function (error) {
//       if (error) {
//         onError(error);
//       }
//     });

//     room.on("members", function (members) {
//       if (members.length > 2) {
//         setStatus("Room full. Only 2 users allowed.");
//         return;
//       }

//       attachRoomDataListener();

//       if (members.length === 2) {
//         hasAcceptedCall = true;
//         createPeerConnection(true);
//         startOutgoingCall();
//       } else {
//         setStatus("Waiting for another user to join...");
//       }
//     });
//   });
// }

// startApp();
