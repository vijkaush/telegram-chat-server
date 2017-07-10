
'use strict';

require( 'dotenv' ).config( {silent: true} );
var sync_request = require('sync-request');
var context_var = {};
var express = require( 'express' );  // app server
var bodyParser = require( 'body-parser' );  // parser for post requests
var watson = require( 'watson-developer-cloud' );  // watson sdk
var mysql = require('mysql');
var replaceall = require("replaceall");
//Bot token:394686899:AAFn3f790AbTmHlySeFeMd5XLp3sP55MVYI

// The following requires are needed for logging purposes
var uuid = require( 'uuid' );
var vcapServices = require( 'vcap_services' );
var basicAuth = require( 'basic-auth-connect' );
var locationtype;


var pool = mysql.createPool({
  connectionLimit:10,
  host: "us-cdbr-iron-east-03.cleardb.net",
  user: "bb9743850504c2",
  password: "3a9ee07e",
  database: "ad_5ca1da985034b44",
  multipleStatements: true
 });
 

// The app owner may optionally configure a cloudand db to track user input.
// This cloudand db is not required, the app will operate without it.
// If logging is enabled the app must also enable basic auth to secure logging
// endpoints
var cloudantCredentials = vcapServices.getCredentials( 'cloudantNoSQLDB' );
var cloudantUrl = null;
if ( cloudantCredentials ) {
  cloudantUrl = cloudantCredentials.url;
}
cloudantUrl = cloudantUrl || process.env.CLOUDANT_URL; // || '<cloudant_url>';
var logs = null;
var app = express();

// Bootstrap application settings
app.use( express.static( './public' ) ); // load UI from public folder
app.use( bodyParser.json() );

// Create the service wrapper
var conversation = watson.conversation( {
 
  url: 'https://gateway.watsonplatform.net/conversation/api',
  username: process.env.CONVERSATION_USERNAME || 'b7159592-076b-4d84-8c51-a7b3d79c6bb5',
  password: process.env.CONVERSATION_PASSWORD || 'D3ZKIzMsN6k0',
  version_date: '2017-05-10',
  version: 'v1'
} );


app.post( '/api/try', function(req, res) {

var text = req.query.text;
console.log('Input Text is: '+text);
 return res.json( {
      'output': {
        'text': 'Its working fine...'
      }
    } );
});


// Endpoint to be call from the client side
app.post( '/api/message', function(req, res) {
	var text = req.query.text;
	var chatId = req.query.chatId;
	console.log('input : '+text);
	console.log('Chat Id --> : '+chatId);
   var workspace = '7d98012d-0e4a-4ed6-95c2-9399496afaa9' || process.env.WORKSPACE_ID;
  
  if ( !workspace) {
    return res.json( {
      'output': {
        'text': 'The app has not been configured with a <b>WORKSPACE_ID</b> environment variable. Please refer to the ' +
        '<a href="https://github.com/watson-developer-cloud/conversation-simple">README</a> documentation on how to set this variable. <br>' +
        'Once a workspace has been defined the intents may be imported from ' +
        '<a href="https://github.com/watson-developer-cloud/conversation-simple/blob/master/training/car_workspace.json">here</a> in order to get a working application.'
      }
    } );
  }
  var payload = {
    workspace_id: workspace,
    context: {},
    input: {text}
  };
  if ( req.body ) {
		console.log('inside req.body');
    	payload.input = {text};
		
		}
		 
  
      payload.context = context_var;
	  //console.log('payload.context = ',payload.context);
	
	
  
  // Send the input to the conversation service
	
  conversation.message( payload, function(err, data) {
  //console.log('Inside the Msg method payload : ',JSON.stringify(payload));
 // console.log("conetxt variables : ",payload.context.system.race+"  "+payload.context.system.meeting )
   
   if ( err ) {
	console.log('inside ERROR Msg'+err+" STATUS="+res.statusCode);
	 return res.status(statusCode >= 100 && statusCode < 600 ? err.code : 500);
	 // return res.status( err.code || 500 ).json( err );
	//return res.status(500).json(err);
    }
	updateMessage(payload,data,function(err,data){
		if(!empty(text))
			dbInsert(text,data);
		return res.status(200).json(data);
	
	});
	
	
	/*if(res.statusCode==200){
	console.log('inside SUCCESS Msg')
    return res.json( updateMessage( payload, data ) );
	}
	console.log('inside ERROR Msg'+err+" STATUS="+res.statusCode);
	  return res.status( err.code || 500 ).json( err );
	*/
  } );
} );

/**
 * Updates the response text using the intent confidence
 * @param  {Object} input The request to the Conversation service
 * @param  {Object} response The response from the Conversation service
 * @return {Object}          The response with the updated message
 */
function updateMessage(input, response,callbackFunc) {

	var intent='';
	if (response.intents && response.intents[0]) {
		console.log("intents found")
		intent = response.intents[0];
		console.log("intent name is -->",intent)
		
	}
	context_var = response.context;
	console.log(context_var);
	
  
	  if(context_var.myvar == ''){
		console.log("my var is blank and going to set value");							
			response.context.myvar = 'value'		 
		}	
  
		if(!empty(intent)){
			if(intent.intent=='greetings' ||intent.intent=='end_conversation'){
				console.log("Greeting intent found");
				if(!empty(context_var.meeting)){
					console.log("**** Deleteing meeting ****");
					response.context.meetracevisited='no'
					delete context_var.meeting
				}
				if(!empty(context_var.race)){
					console.log("**** Deleteing race ****");
					response.context.meetracevisited='no'
					delete context_var.race
				}
				
				if(!empty(context_var.horseNum)){
					console.log("**** Deleteing horseNum ****");
					context_var.horsenumvisited="no";
					delete context_var.horseNum;
					
				
				}
			}
		}
	// to fetch the details related to race
	if((!empty(context_var.prizeMoney)) || !empty(context_var.raceType) || (!empty(context_var.raceDistance)) || (!empty(context_var.trackType)) || (!empty(context_var.startTime))){

		if(!empty(context_var.horseNum)) {
					delete context_var.horseNum;
				}
		  var race_id=0;	
		if(context_var.race == "race one" || context_var.race == "race 1")
			race_id = 1;
		if(context_var.race == "race two" || context_var.race == "race 2")
			race_id = 2;
		if(context_var.race == "race three" || context_var.race == "race 3")
					race_id = 3;
		if(context_var.race == "race four" || context_var.race == "race 4")
					race_id = 4;
		if(context_var.race == "race five" || context_var.race == "race 5")
					race_id = 5;
		if(context_var.race == "race six" || context_var.race == "race 6")
			race_id = 6;
		if(context_var.race == "race seven" || context_var.race == "race 7")
			race_id = 7;
		if(context_var.race == "race eight" || context_var.race == "race 8")
					race_id = 8;
		if(context_var.race == "race nine" || context_var.race == "race 9")
					race_id = 9;
		if(context_var.race == "race ten" || context_var.race == "race 10")
					race_id = 10;					
		if(context_var.race == "race eleven" || context_var.race == "race 11")
					race_id = 11;
		/*else
			callbackFunc(null,"The specified race doesn't exist");*/
		
		
		
		   pool.getConnection(function(err, connection) {
			 console.log("getting connection")
			  connection.query("Select * from race where race_card_id = (Select id from race_card where race_card.meeting_name like '%"+context_var.meeting+"%') and race_no="+race_id, function (error, result, fields) {
				
				var data = JSON.stringify(result);
				console.log("data",data);
				
				if(!empty(context_var.prizeMoney)){	
					var prizeMoney = JSON.parse(data)[0]["race_prize_money"];
					if(!empty(prizeMoney)){
						delete context_var.prizeMoney;
						callbackFunc(null,"Prize money for "+ context_var.race +" is " + prizeMoney);
					}
					else{
						callbackFunc(null, "Prize money for "+ context_var.race +" not found");
					}
				}
				if(!empty(context_var.raceType)){	
					var raceType = JSON.parse(data)[0]["race_type"];
					if(!empty(raceType)){
						delete context_var.raceType;
						callbackFunc(null,"Race Type for "+ context_var.race +" is " + raceType);
					}
					else{
						callbackFunc(null, "Race Type for "+ context_var.race +" not found");
					}
				}
				if(!empty(context_var.raceDistance)){	
					var raceDistance = JSON.parse(data)[0]["race_distance"];
					if(!empty(raceDistance)){
						delete context_var.raceDistance;
						callbackFunc(null,"Race Distance for "+ context_var.race +" is " + raceDistance);
					}
					else{
						callbackFunc(null, "Race Distance for "+ context_var.race +" not found");
					}
				}
				if(!empty(context_var.trackType)){	
					var trackType = JSON.parse(data)[0]["race_track_type"];
					if(!empty(trackType)){
						delete context_var.trackType;
						callbackFunc(null,"Track type for "+ context_var.race +" is " + trackType);
					}
					else{
						callbackFunc(null, "Track type for "+ context_var.race +" not found");
					}
				}
				if(!empty(context_var.startTime)){	
					var startTime = JSON.parse(data)[0]["race_advertised_start_time"];
					if(!empty(startTime)){
						delete context_var.startTime;
						callbackFunc(null,"start time for "+ context_var.race +" is " + startTime);
					}
					else{
						callbackFunc(null, "start time for "+ context_var.race +" not found");
					}
				}
				   
			
			
			    connection.release();

			    // Handle error after the release.
			    if (error) throw error;

			    // Don't use the connection here, it has been returned to the pool.
			  });
			});			
		
	}
	
	// to get the number of races and horses
	else if((!empty(context_var.numOfHorse)) || (!empty(context_var.numOfRaces))){
	
		
		var race_id=0;	
		if(context_var.race == "race one" || context_var.race == "race 1")
			race_id = 1;
		if(context_var.race == "race two" || context_var.race == "race 2")
			race_id = 2;
		if(context_var.race == "race three" || context_var.race == "race 3")
					race_id = 3;
		if(context_var.race == "race four" || context_var.race == "race 4")
					race_id = 4;
		if(context_var.race == "race five" || context_var.race == "race 5")
					race_id = 5;
		if(context_var.race == "race six" || context_var.race == "race 6")
			race_id = 6;
		if(context_var.race == "race seven" || context_var.race == "race 7")
			race_id = 7;
		if(context_var.race == "race eight" || context_var.race == "race 8")
					race_id = 8;
		if(context_var.race == "race nine" || context_var.race == "race 9")
					race_id = 9;
		if(context_var.race == "race ten" || context_var.race == "race 10")
					race_id = 10;					
		if(context_var.race == "race eleven" || context_var.race == "race 11")
					race_id = 11;
		/*else
			callbackFunc(null,"The specified race doesn't exist");*/
			
		if(!empty(context_var.numOfHorse))
		{	
		
			if(!empty(context_var.horseNum)) {
					delete context_var.horseNum;
				}
			pool.getConnection(function(err, connection) {
			  connection.query("Select count(*) from horse where race_id = "+race_id, function (error, result, fields) {
			   var data = JSON.stringify(result);
						console.log("data",data);
						var num = JSON.parse((data));
						var numOfHorse = num[0]['count(*)'];
											
						if(!empty(numOfHorse)){
							delete context_var.numOfHorse;
							callbackFunc(null,"number of horses for "+ context_var.race +" is " + numOfHorse);
						}
						else{
							callbackFunc(null, "number of horses for "+ context_var.race +" not found");
						}		
			    connection.release();

			    // Handle error after the release.
			    if (error) throw error;

			    // Don't use the connection here, it has been returned to the pool.
			  });
			});
		
		
		}
		else if(!empty(context_var.numOfRaces))
		{	
				if(!empty(context_var.horseNum)) {
					delete context_var.horseNum;
				}
				pool.getConnection(function(err, connection) {
				connection.query("Select count(*) from race", function (error, result, fields) {
				   var data = JSON.stringify(result);
						console.log("data",data);
						var num = JSON.parse((data));
						var numOfRaces = num[0]['count(*)'];
						
						if(!empty(numOfRaces)){
							delete context_var.numOfRaces;
							callbackFunc(null,"number of races is " + numOfRaces);
						}
						else{
							callbackFunc(null, "number of races not found");
						}		
				    connection.release();

				    // Handle error after the release.
				    if (error) throw error;

				    // Don't use the connection here, it has been returned to the pool.
				  });
				});
		}	
	}	

	// to fetch the details related to horse
   else if(!empty(context_var.horseNum))
    {
		console.log("***horsenumvisited*****",context_var.horsenumvisited);
		console.log("inside horsenum visited else if block");
		if(!empty(context_var.jockey) || !empty(context_var.horseName) || !empty(context_var.colorCode) || !empty(context_var.color) || !empty(context_var.trainer) || (!empty(context_var.rating)) || (!empty(context_var.x`)) || (!empty(context_var.age)) || (!empty(context_var.horseColour)) || (!empty(context_var.countryOfBred))||(!empty(context_var.sex)) || (!empty(context_var.sire)) || (!empty(context_var.dam)) || (!empty(context_var.owner)) || (!empty(context_var.numOfStarts)) || (!empty(context_var.numOfFirst)) || (!empty(context_var.numOfSecond)) || (!empty(context_var.numOfThird)) || (!empty(context_var.numOfFourth)) || (!empty(context_var.numOfUnplaced)) || (!empty(context_var.input_action))){

		  var race_id=0,horse_id=0;	
		  var horseNum;
		if(context_var.race == "race one" || context_var.race == "race 1")
			race_id = 1;
		if(context_var.race == "race two" || context_var.race == "race 2")
			race_id = 2;
		if(context_var.race == "race three" || context_var.race == "race 3")
					race_id = 3;
		if(context_var.race == "race four" || context_var.race == "race 4")
					race_id = 4;
		if(context_var.race == "race five" || context_var.race == "race 5")
					race_id = 5;
		if(context_var.race == "race six" || context_var.race == "race 6")
			race_id = 6;
		if(context_var.race == "race seven" || context_var.race == "race 7")
			race_id = 7;
		if(context_var.race == "race eight" || context_var.race == "race 8")
					race_id = 8;
		if(context_var.race == "race nine" || context_var.race == "race 9")
					race_id = 9;
		if(context_var.race == "race ten" || context_var.race == "race 10")
					race_id = 10;					
		if(context_var.race == "race eleven" || context_var.race == "race 11")
					race_id = 11;
		
		
		if(context_var.horseNum == "horse 1" || context_var.horseNum == "horse one"){
			horse_id = 1;
			horseNum = context_var.horseNum;
			console.log("horseNum ---->" ,horseNum);
		//	delete context_var.horseNum;
			}
		if(context_var.horseNum == "horse 2" || context_var.horseNum == "horse two"){
			horse_id = 2;
			horseNum = context_var.horseNum;
			console.log("horseNum ---->" ,horseNum);
			//delete context_var.horseNum;
			}
		if(context_var.horseNum == "horse 3" || context_var.horseNum == "horse three"){
			horse_id = 3;	
			horseNum = context_var.horseNum;
			console.log("horseNum ---->" ,horseNum);
			//delete context_var.horseNum;
			}
		if(context_var.horseNum == "horse 4" || context_var.horseNum == "horse four"){
			horse_id = 4;
			horseNum = context_var.horseNum;
			console.log("horseNum ---->" ,horseNum);
			//delete context_var.horseNum;
			}
		if(context_var.horseNum == "horse 5" || context_var.horseNum == "horse five"){
			horse_id = 5;
			horseNum = context_var.horseNum;
			console.log("horseNum ---->" ,horseNum);
			//delete context_var.horseNum;
			}
		if(context_var.horseNum == "horse 6" || context_var.horseNum == "horse six"){
			horse_id = 6;
			horseNum = context_var.horseNum;
			console.log("horseNum ---->" ,horseNum);
			//delete context_var.horseNum;
			}
		if(context_var.horseNum == "horse 7" || context_var.horseNum == "horse seven"){
			horse_id = 7;
			horseNum = context_var.horseNum;
			console.log("horseNum ---->" ,horseNum);
			//delete context_var.horseNum;
			}
		if(context_var.horseNum == "horse 8" || context_var.horseNum == "horse eight"){
			horse_id = 8;
			horseNum = context_var.horseNum;
			console.log("horseNum ---->" ,horseNum);
			//delete context_var.horseNum;
			}
		if(context_var.horseNum == "horse 9" || context_var.horseNum == "horse nine"){
			horse_id = 9;
			horseNum = context_var.horseNum;
			console.log("horseNum ---->" ,horseNum);
			//delete context_var.horseNum;
			}
		if(context_var.horseNum == "horse 10" || context_var.horseNum == "horse ten"){
			horse_id = 10;
			horseNum = context_var.horseNum;
			console.log("horseNum ---->" ,horseNum);
			//delete context_var.horseNum;
			}
		if(context_var.horseNum == "horse 11" || context_var.horseNum == "horse eleven"){
			horse_id = 11;	
			horseNum = context_var.horseNum;
			console.log("horseNum ---->" ,horseNum);
			//delete context_var.horseNum;
			}
		if(context_var.horseNum == "horse 12" || context_var.horseNum == "horse twelve"){
			horse_id = 12;	
			horseNum = context_var.horseNum;
			console.log("horseNum ---->" ,horseNum);
			//delete context_var.horseNum;
		}
		
		if (race_id > 0 && race_id < 12){
		  pool.getConnection(function(err, connection) {
			  // Use the connection
			console.log("**********before executing query*******");
			console.log("horse id---->",horse_id);
			console.log("race id---->",race_id);
			console.log("input_action---->",context_var.input_action);
			
			  connection.query("Select * from horse where Horse_no = "+horse_id+" and race_id = "+race_id, function (error, result, fields) {
			    var data = JSON.stringify(result);
					console.log("data",data);
					connection.release();	

					 if(!empty(context_var.jockey)){		 
						  var jockey = JSON.parse(data)[0]["Jockey"];
						  if(!empty(jockey)){
							console.log("jockey not empty");
							delete context_var.jockey;
							callbackFunc(null,"Jockey for "+ horseNum +" is " + jockey);
						 }
						 else{
								callbackFunc(null, "Jockey for "+ horseNum + " not found");
						}
					}
					if(!empty(context_var.horseName)){	
						var horseName = JSON.parse(data)[0]["Name"];
						
						 if(!empty(horseName)){
						    console.log("horse name is --->",horseName)	
							delete context_var.horseName;
							callbackFunc(null,horseName);
						 }
						 else{
							callbackFunc(null, "Name of"+ horseNum + " not found");
						}
					}	
					if(!empty(context_var.colorCode)){	
						var colorCode = JSON.parse(data)[0]["Colour_Code"];			
						 if(!empty(colorCode)){
							console.log("color code not empty");
							delete context_var.colorCode;
							callbackFunc(null,"The color code of "+ horseNum +" is " + colorCode);
						 }
						 else{
							callbackFunc(null, "The color code of "+ horseNum + " not found");
						}
					}
					if(!empty(context_var.color)){	
						var color = JSON.parse(data)[0]["Colour_Desc"];			
						 if(!empty(color)){
							console.log("color not empty");
						    console.log("Color for jokecy is ",color);
							delete context_var.color;
							callbackFunc(null,"The color description of Jockey is"+ color );
						 }
						 else{
							callbackFunc(null, "The color description of Jockey of"+ horseNum + " not found");
						}
					}
					if(!empty(context_var.trainer)){	
						var trainer = JSON.parse(data)[0]["Trainer"];			
						 if(!empty(trainer)){
							console.log("trainer not empty");
							delete context_var.trainer;
							callbackFunc(null,"The trainer of "+ horseNum +" is " + trainer);
						 }
						 else{
								callbackFunc(null, "The trainer of"+ horseNum + " not found");
						}
					}
					if(!empty(context_var.rating)){	
						var rating = JSON.parse(data)[0]["Rating"];			
						 if(!empty(rating)){
							console.log("rating not empty");
							delete context_var.rating;
							callbackFunc(null,"The rating of "+ horseNum +" is " + rating);
						 }
						 else{
								callbackFunc(null, "The rating of"+ horseNum + " not found");
						}
					}
					if(!empty(context_var.weight)){	
						var weight = JSON.parse(data)[0]["Weight"];			
						 if(!empty(weight)){
							console.log("weight not empty");
							delete context_var.weight;
							callbackFunc(null,"The weight of "+ horseNum +" is " + weight);
						 }
						 else{
								callbackFunc(null, "The weight of"+ horseNum + " not found");
						}
					}
					if(!empty(context_var.age)){	
						var age = JSON.parse(data)[0]["Age"];			
						 if(!empty(age)){
							console.log("age not empty");
							delete context_var.age;
							callbackFunc(null,"The age of "+ horseNum +" is " + age);
						 }
						 else{
								callbackFunc(null, "The age of"+ horseNum + " not found");
						}
					}
					if(!empty(context_var.horseColour)){	
						var horseColour = JSON.parse(data)[0]["Colour"];			
						 if(!empty(horseColour)){
							console.log("horse color not empty");
							delete context_var.horseColour;
							callbackFunc(null,"The colour of "+ horseNum +" is " + horseColour);
						 }
						 else{
								callbackFunc(null, "The colour of"+ horseNum + " not found");
						}
					}
					if(!empty(context_var.countryOfBred)){	
						var countryOfBred = JSON.parse(data)[0]["Country_Of_Bred"];			
						 if(!empty(countryOfBred)){
							console.log("country of bred not empty");
							delete context_var.countryOfBred;
							callbackFunc(null,"The country of bred of "+ horseNum +" is " + countryOfBred);
						 }
						 else{
								callbackFunc(null, "The country of bred of"+ horseNum + " not found");
						}
					}
					if(!empty(context_var.sex)){	
						var sex = JSON.parse(data)[0]["Sex"];			
						 if(!empty(sex)){
							console.log("sex not empty");
							delete context_var.sex;
							callbackFunc(null,"The sex of "+ horseNum +" is " + sex);
						 }
						 else{
							callbackFunc(null, "The sex of"+ horseNum + " not found");
						}
					}
					if(!empty(context_var.sire)){
						if(context_var.sire=='sire'){
						var sire = JSON.parse(data)[0]["Sire"];			
						 if(!empty(sire)){
							var sireMsg = response.output.text[0];
							console.log("SireMSg--> ",sireMsg);
							console.log("sire not empty");
							delete context_var.sire;
							callbackFunc(null,"The sire of "+ horseNum +" is " + sire);
						 }
						 else{
								callbackFunc(null, "The sire of"+ horseNum + " not found");
						}
						}
					}
					if(!empty(context_var.dam)){
						if(context_var.dam=='dam'){
						var dam = JSON.parse(data)[0]["Dam"];			
						 if(!empty(dam)){
							console.log("dam not empty");
							delete context_var.dam;
							callbackFunc(null,"The dam of "+ horseNum +" is " + dam);
						 }
						 else{
								callbackFunc(null, "The dam of"+ horseNum + " not found");
							}
						}
					}	
					if(!empty(context_var.owner)){	
						var owner = JSON.parse(data)[0]["Owner"];			
						 if(!empty(owner)){
							console.log("owner not empty");
							delete context_var.owner;
							callbackFunc(null,"The owner of "+ horseNum +" is " + owner);
						 }
						 else{
								callbackFunc(null, "The owner of"+ horseNum + " not found");
						}
					} 
					if(!empty(context_var.numOfStarts)){	
						var numOfStarts = JSON.parse(data)[0]["No_Of_Starts"];			
						 if(!empty(numOfStarts)){
							console.log("numOfStarts not empty");
							delete context_var.numOfStarts;
							callbackFunc(null,"The number Of Starts of "+ horseNum +" is " + numOfStarts);
						 }
						 else{
							callbackFunc(null, "The number Of Starts of"+ horseNum + " not found");
						}
					}
					if(!empty(context_var.numOfFirst)){	
						var numOfFirst = JSON.parse(data)[0]["No_Of_1st_Placing"];			
						 if(!empty(numOfFirst)){
						 	console.log("numOfFirst not empty");
							delete context_var.numOfFirst;
							callbackFunc(null,"The number Of First placing of "+ horseNum +" is " + numOfFirst);
						 }
						 else{
								callbackFunc(null, "The number Of First placing of"+ horseNum + " not found");
						}
					}
					if(!empty(context_var.numOfSecond)){	
						var numOfSecond = JSON.parse(data)[0]["No_Of_2nd_Placing"];			
						 if(!empty(numOfSecond)){
						 	console.log("numOfSecond not empty");
							delete context_var.numOfSecond;
							callbackFunc(null,"The number Of Second placing of "+ horseNum +" is " + numOfSecond);
						 }
						 else{
								callbackFunc(null, "The number Of Second placing of"+ horseNum + " not found");
						}
					}
					if(!empty(context_var.numOfThird)){	
						var numOfThird = JSON.parse(data)[0]["No_Of_3rd_Placing"];			
						 if(!empty(numOfThird)){
							console.log("numOfThird not empty"); 
							delete context_var.numOfThird;
							callbackFunc(null,"The number Of Third placing of "+ horseNum +" is " + numOfThird);
						 }
						 else{
								callbackFunc(null, "The number Of Third placing of"+ horseNum + " not found");
						}
					}
					if(!empty(context_var.numOfFourth)){	
						var numOfFourth = JSON.parse(data)[0]["No_Of_4th_Placing"];			
						 if(!empty(numOfFourth)){
						 	console.log("numOfFourth not empty"); 
							delete context_var.numOfFourth;
							callbackFunc(null,"The number Of Fourth placing of "+ horseNum +" is " + numOfFourth);
						 }
						 else{
								callbackFunc(null, "The number Of Fourth placing of"+ horseNum + " not found");
						}
					}
					if(!empty(context_var.numOfUnplaced)){	
						var numOfUnplaced = JSON.parse(data)[0]["No_Of_Unplaced"];			
						 if(!empty(numOfUnplaced)){
						  	console.log("numOfUnplaced not empty"); 
							delete context_var.numOfUnplaced;
							callbackFunc(null,"The number Of Unplaced placing of "+ horseNum +" is " + numOfUnplaced);
						 }
						 else{
								callbackFunc(null, "The number Of Unplaced placing of"+ horseNum + " not found");
						}
					}
			    //connection.release();

			    // Handle error after the release.
			   // if (error) throw error;

			    // Don't use the connection here, it has been returned to the pool.
			  });
			});
        }
		  else{
				var text = response.output.text.toString();
				return callbackFunc(null, response.output.text[0]);
			}
	 } // end of if for race > 0 && race < 12
		
	}
 
  else{
		var text = response.output.text.toString();
		return callbackFunc(null, response.output.text[0]);
	}
}

function empty(data){

  if(typeof(data) == 'number' || typeof(data) == 'boolean')
  { 
    return false; 
  }
  if(typeof(data) == 'undefined' || data === null)
  {
    return true; 
  }
  if(typeof(data.length) != 'undefined')
  {
    return data.length == 0;
  }
  var count = 0;
  for(var i in data)
  {
    if(data.hasOwnProperty(i))
    {
      count ++;
    }
  }
  return count == 0;
}

//to handle the Db connection 
function handleDisconnect() {
	 // Recreate the connection, since
     // the old one cannot be reused.

	con = mysql.createConnection({
				  host: "us-cdbr-iron-east-03.cleardb.net",
				  user: "bb9743850504c2",
				  password: "3a9ee07e",
				  database: "ad_5ca1da985034b44",
				  multipleStatements: true
			 });
 
  con.connect(function(err) {              // The server is either down
    if(err) {                                     // or restarting (takes a while sometimes).
      console.log('error when connecting to db:', err);
      setTimeout(handleDisconnect, 2000); // We introduce a delay before attempting to reconnect,
    }                                     // to avoid a hot loop, and to allow our node script to
  });                                     // process asynchronous requests in the meantime.
                                          // If you're also serving http, display a 503 error.
  con.on('error', function(err) {
    console.log('db error', err);
    if(err.code === 'PROTOCOL_CONNECTION_LOST') { // Connection to the MySQL server is usually
      handleDisconnect();                         // lost due to either server restart, or a
    } else {                                      // connnection idle timeout (the wait_timeout
      throw err;                                  // server variable configures this)
    }
  });
}


// to store messages in the Db
function dbInsert(question,answer){
		console.log(question,answer);
		pool.getConnection(function(err, connection) {
		  // Use the connection
		  var date = new Date().getDate()+"-"+new Date().getMonth()+"-"+new Date().getYear()+"  "+new Date().getHours()+":"+new Date().getMinutes()+":"+new Date().getSeconds();
		  question  = replaceall("'","''",question);
		  answer  = replaceall("'","''",answer);
		  connection.query("Insert into conversation(date,user,chatbot) values('"+date+"','"+question+"','"+answer+"')", function (error, results, fields) {
		    // And done with the connection.
		    connection.release();

		    // Handle error after the release.
		    if (error) throw error;

		    // Don't use the connection here, it has been returned to the pool.
		  });
		});

}


//module.exports = app;
var host = (process.env.VCAP_APP_HOST || 'localhost');
var port = (process.env.VCAP_APP_PORT || 3001);
app.listen(port, host);

