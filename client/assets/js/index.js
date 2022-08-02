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
    onSocketMessage( event.data );
  } );
}

createSocket();

//------------------------------------------------------ createLog ------------------------------------------------------
function createLog( type, data ) {
  logHTMLStructure = {};

  //Templates
  logHTMLStructure[ 'connect' ] = '<p style="color:{{COLOR}};"><i class="bi bi-check-circle-fill"></i> <img src="{{USER-IMAGE}}" height="35"> <b>The user "{{NAME}}" join the room at {{DATE}} :)</b></p>';
  logHTMLStructure[ 'disconnect' ] = '<p style="color:{{COLOR}};"><i class="bi bi-exclamation-triangle"></i> <img src="{{USER-IMAGE}}" height="35"> <b>The user "{{NAME}}" left the room at {{DATE}} :(</b></p>';
  logHTMLStructure[ 'change' ] = '<p><img src="{{USER-IMAGE}}" height="35"> <span style="color:{{COLOR}};"><b>{{NAME}}</b></span> <span class="{{ACTION-COLOR-CLASS}}"><b>{{ACTION}}</b></span> <i>Lightbulb at {{DATE}}</i></p>';


  const ul = document.querySelector( '#logs' );
  let log = logHTMLStructure[ type ];
  try {
    log = log.replace( '{{USER-IMAGE}}', data.image );
    log = log.replace( '{{COLOR}}', data.color );
    log = log.replace( '{{NAME}}', data.username );
    log = log.replace( '{{ACTION-COLOR-CLASS}}', data.actionColorClass );
    log = log.replace( '{{ACTION}}', data.actionText );
    log = log.replace( '{{DATE}}', data.date );
  } catch ( err ) {}

  const li = document.createElement( 'li' );
  li.innerHTML = log;
  ul.prepend( li );
}

//------------------------------------------------------ Manage Server Message ------------------------------------------------------
const lightbulbButtonElement = document.querySelector( '#lightbulb-button' );

//--- changeLightbulbSvg ---
function changeLightbulbSvg( status ) {
  const lightbulbImageElement = document.querySelector( '#lightbulb' );
  const lightbulbButtonTextElement = document.querySelector( '#lightbulb-button-text b' );

  const body = document.querySelector( 'body' );

  if ( status === true ) {
    body.style.color = 'black';
    body.style.backgroundColor = 'white';
    lightbulbImageElement.src = lightbulbImgOnPath;
    lightbulbButtonElement.checked = true;
    lightbulbButtonTextElement.innerHTML = 'Turn Off';
  } else if ( status === false ) {
    body.style.color = 'white';
    body.style.backgroundColor = 'black';
    lightbulbImageElement.src = lightbulbImgOffPath;
    lightbulbButtonElement.checked = false;
    lightbulbButtonTextElement.innerHTML = 'Turn On';
  }
}

//--- lightbulbChanged ---
function lightbulbChanged( data ) {
  if ( data.status === true ) {
    data.actionColorClass = 'text-warning';
    data.actionText = 'turned on';
  } else if ( data.status === false ) {
    data.actionColorClass = 'text-dark';
    data.actionText = 'turned off';
  }

  changeLightbulbSvg( data.status );
  createLog( 'change', data );
}

//--- lightbulbChangeReceivedByServer --- (When the server responses your message)
function lightbulbChangeReceivedByServer() {
  console.log( 'The server answer your message' );
  requestSent = false;
  lightbulbButtonElement.disabled = false;
}

//--- userDisconnected --- (When a user disconnects)
function userDisconnected( data ) {
  createLog( 'disconnect', data );
}

//--- userConnected --- (When a user connects)
function userConnected( data ) {
  createLog( 'connect', data );
}

//--- setUserData --- (When returned by the Server)
function setUserData( data, tokenReceived ) {
  const username = document.querySelector( '#username h1' );
  username.innerHTML = data.username;
  const userImage = document.querySelector( '#username img' );
  userImage.src = data.image;

  token = tokenReceived;
  sessionStorage.setItem( 'token', tokenReceived );

  changeLightbulbSvg( data.status );
}

//--- onSocketMessage ---
function onSocketMessage( dataStr ) {
  const data = JSON.parse( dataStr );

  console.log( 'Data received from Server' );
  console.log( data );

  if ( data.message === 'Internal server error' ) {
    requestSent = false;
    socket.close();
    return;
  }

  const action = data.action;
  const userImageSrc = 'https://robohash.org/' + data.username + '.png';
  const date = new Date().toString();
  const tokenReceived = data.token;

  const parsedData = { //Parsing the received data
    image: userImageSrc,
    username: data.username,
    color: data.color,
    date: date,
    status: data.status
  };

  switch( action ) {
    case 'connect':
      userConnected( parsedData );
    break;

    case 'identification':
      setUserData( parsedData, tokenReceived );
    break;

    case 'disconnect':
      userDisconnected( parsedData );
    break;

    case 'change':
      lightbulbChanged( parsedData );
    break;

    case 'changeReceivedByServer':
      lightbulbChangeReceivedByServer();
    break;

    default:
      console.log( 'Action "' + action + '" unknown' );
  }
}

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
