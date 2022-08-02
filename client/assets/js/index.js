const URL = 'wss://amazonaws.com/';
let socket;

const lightbulbImgOffPath = 'assets/img/light-bulb-off.svg';
const lightbulbImgOnPath = 'assets/img/light-bulb-on.svg';
let token = sessionStorage.getItem( 'token' ) || undefined;

//------------------------------------------------------ createSocket ------------------------------------------------------
//--- onSocketOpen ---
function onSocketOpen() {
  const spinnerSectionElement = document.querySelector( '#spinner' );
  spinnerSectionElement.classList.add( 'd-none' );
  const lightbulbSection = document.querySelector( '#lightbulb-section' );
  lightbulbSection.classList.remove( 'd-none' );

  console.log( 'Connected to the socket' );

  sendToSocket = {
    action: 'connectUser'
  };
  if ( token !== undefined ) {
    sendToSocket.token = token;
  }
  socket.send( JSON.stringify( sendToSocket ) );
}

//--- onSocketClose ---
function onSocketClose() {
  const spinnerSectionElement = document.querySelector( '#spinner' );
  spinnerSectionElement.classList.remove( 'd-none' );
  const lightbulbSectionElement = document.querySelector( '#lightbulb-section' );
  lightbulbSectionElement.classList.add( 'd-none' );

  const username = document.querySelector( '#username h1' );
  username.innerHTML = '<i class="bi bi-exclamation-triangle"></i> DISCONNECTED, CONNECTING AGAIN';
  const userImage = document.querySelector( '#username img' );
  userImage.src = '';

  console.log( 'Disconnected form the socket' );
  console.log( 'Trying to connect again' );
  setTimeout( createSocket, 3000 );
}

//--- onSocketError ---
function onSocketError( event ) {
  console.error( 'There was an error on the socket connection' );
  console.error( event );
}

//--- createSocket ---
function createSocket() {
  socket = new WebSocket( URL );

  socket.addEventListener( 'open', onSocketOpen );
  socket.addEventListener( 'close', onSocketClose );
  socket.addEventListener( 'error', ( event ) => {
    onSocketError( event );
  } );
  socket.addEventListener( 'message', ( event ) => {
    //onSocketMessage( event.data );
  } );
}

createSocket();

//------------------------------------------------------ sendChangeLightbulbToServer ------------------------------------------------------
let requestSent = false;

function sendChangeLightbulbToServer() {
  if ( requestSent ) {
    console.warn( 'We are waiting for a response from the server' );
    return;
  }

  console.log( 'Light change sent to AWS' );

  sendToSocket = {
    token: token,
    action: 'changeLight'
  };
  socket.send( JSON.stringify( sendToSocket ) );
  requestSent = true;
  lightbulbButtonElement.disabled = true;
}
