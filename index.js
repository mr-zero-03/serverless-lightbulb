const AWS = require( 'aws-sdk' );
const fs = require( 'fs' );
const names = require( './libs/names' );

const config = fs.readFileSync( './config/.config', { encoding: 'utf8' } );

const TABLENAME = process.env.DYNAMODB_USERS_TABLE;
const dynamo = new AWS.DynamoDB.DocumentClient();
const dynamoDBArgs = {
  TableName: TABLENAME
}

const ENDPOINT = config.split( 'ENDPOINT=' )[ 1 ];
const client = new AWS.ApiGatewayManagementApi( { endpoint: ENDPOINT } );

const users = {};
const usersConnectionId = {};
let connectedUsers = 0;
let lightbulb = false;


//------------------------------------------------------ Send to Clients ------------------------------------------------------
async function sendToClient( token, response ) {
  try {
    const params = {
      'ConnectionId': usersConnectionId[ token ],
      'Data': Buffer.from( JSON.stringify( response ) )
    };

    await client.postToConnection( params ).promise();
    console.log( 'Sent the lightbulb change to the connection with name: "' + users[ token ].name + '"' );

  } catch ( err ) {
    console.error( 'Error changing the lightbulb to the user with the name: "' + users[ token ].name + '"' );
    console.error( err );
    await deleteUser( token );
  }
}

async function sendToClients( response ) {
  const allPromises = [];

  for ( const token in users ) {
    allPromises.push( sendToClient( token, response ) );
  }

  return( Promise.all( allPromises ) );
}

//------------------------------------------------------ Lightbulb ------------------------------------------------------
//-- changeLightbulb
async function changeLightbulb( changerToken ) {
  lightbulb = !lightbulb;

  const response = {
    action: 'change',
    username: users[ changerToken ].name,
    color: users[ changerToken ].color,
    status: lightbulb
  };

  await sendToClients( response );

  const responseToChanger = {
    action: 'changeReceivedByServer'
  };
  await sendToClient( changerToken, responseToChanger );

  console.log( 'Modifiying Lightblulb' );
}

//------------------------------------------------------ User ------------------------------------------------------
//--- Delete User
async function deleteUser( token ) {
  console.log( 'Deleting the user with the name: "' + users[ token ].name + '", color: "' + users[ token ].color + '"' );

  const response = {
    action: 'disconnect',
    username: users[ token ].name,
    color: users[ token ].color
  };

  //Delete from DynamoDB
  console.log( 'Saving new user on DynamoDB' );
  try {
    await dynamo.delete( {
      ...dynamoDBArgs,
      Key: {
        token: token
      }
    } ).promise();
    console.log( 'User "' + users[ token ].name + '" deleted correctly from DynamoDB' );
  } catch ( err ) {
    console.error( 'Error trying to delete the user "' + users[ token ].name + '" from DynamoDB' );
    console.error( err );
  }

  delete users[ token ];
  delete usersConnectionId[ token ];

  await sendToClients( response );
}

//--- User Create
function randomNumber( min = 100, max = 999 ) {
  const theRandomNumber = Math.floor( Math.random() * ( max - min + 1 ) ) + min;
  return( theRandomNumber );
}

async function createUser( connectionId ) {
  const number = randomNumber();
  const name = names[ connectedUsers ] + number;
  const color = '#' + Math.floor( Math.random() * 16777215 ).toString( 16 );

  const token = name;

  const user = {
    token: token,
    name: name,
    color: color
  };

  usersConnectionId[ token ] = connectionId;

  //Save on DynamoDB the user
  console.log( 'Saving new user on DynamoDB' );
  try {
    await dynamo.put( {
      ...dynamoDBArgs,
      Item: {
        ...user
      }
    } ).promise();
    console.log( 'User "' + user.name + '" saved correctly on DynamoDB' );
  } catch ( err ) {
    console.error( 'Error trying to save the user "' + user.name + '" on DynamoDB' );
    console.error( err );
  }

  return( user );
}

//--- Is the User on the DB
async function getUserFromDB( token, connectionId ) {

  //Search on DynamoDB using the token
  try {
    const userRequest = await dynamo.get( {
      ...dynamoDBArgs,
      Key: {
        token: token
      }
    } ).promise();

    const user = userRequest.Item;

    if ( user ) {
      console.log( 'User "' + user.name + '" obtained correctly from DynamoDB' );
      return( user );
    }
  } catch ( err ) {
    console.error( 'Error trying to get the user with the token "' + token + '" from DynamoDB' );
    console.error( err );
  }

  //If user does not exists create one
  console.log( 'There is not user with the token: "' + token + '", I will create one' );
  await connectUser( false, connectionId );

  return( false );
}

async function connectUser( token, connectionId ) {
  let connectedUser = {};

  if ( token ) {
    //Search on DynamoDB the name and color
    connectedUser = await getUserFromDB( token, connectionId );
    if ( connectedUser === false ) {
      return;
    }
  } else {
    connectedUser = await createUser( connectionId );
    token = connectedUser.token;
    delete connectedUser.token;
  }
  users[ token ] = connectedUser;
  connectedUsers++;

  console.log( 'The user with the name: "' + connectedUser.name + '", color: "' + connectedUser.color + '" was created\n Now there are ' + connectedUsers + ' users connected' );

  const responseToClient = { //Top put up-to-date the connected user
    action: 'identification',
    token: token,
    username: connectedUser.name,
    color: connectedUser.color,
    status: lightbulb
  };
  await sendToClient( token, responseToClient );

  const response = {
    action: 'connect',
    username: connectedUser.name,
    color: connectedUser.color
  };
  await sendToClients( response );
}

//------------------------------------------------------ manageRequest ------------------------------------------------------
async function manageRequest( event ) {
  const connectionId = event.requestContext.connectionId;
  const routeKey = event.requestContext.routeKey;

  let body = {};
  try {
    if ( event.body ) {
      body = JSON.parse( event.body );
    }
  } catch ( err ) {
    //
  }

  const token = body.token || false;
  if ( token ) {
    usersConnectionId[ token ] = connectionId;
  }

  switch ( routeKey ) {
    case '$connect':
    break;

    case 'connectUser':
      await connectUser( token, connectionId );
    break;

    case '$disconnect':
      await deleteUser( token );
    break;

    case 'changeLight':
      await changeLightbulb( token );
    break;

    default:
      console.log( 'Unknow action: "' + routeKey + '" received' );
  }
}

exports.handler = async ( event ) => {
  console.log( 'Event:' );
  console.log( event );

  if ( event ) {
    await manageRequest( event );
  }

  // TODO implement
  const response = {
    statusCode: 200,
    body: JSON.stringify( 'Hello, from Lambda!' )
  };
  return( response );
};
