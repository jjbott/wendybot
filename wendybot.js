var jerk = require( 'jerk' ), 
	sys=require('sys'),
	last_said = new Array(),
	readline = require('readline');
var jenkinsapi = require('jenkins-api');
var color = require('irc-colors');

var JENKINS_URL = "http://jenkins.domain.com";

// options for Jerk Bot
var options =
  { server: 'irc.freenode.com'
  , port: 6667
  , channels: [ '#wendysroom' ]
  , nick: 'MrJenkinz'
  , encoding: 'utf8'
  };

// interval of time in milliseconds to ping a Jenkins job for status
var TIMER = 30000;

// Port to listen for updates
var PORT = 1337;

var rl = readline.createInterface(process.stdin, process.stdout, null);

var jenkins = jenkinsapi.init(JENKINS_URL);

var getLastBuiltRevision = function(d){
	for(var a in d.actions){
		if ( d.actions[a].lastBuiltRevision !== undefined ) {
			return d.actions[a].lastBuiltRevision;
		}
	}
}

var daJerk = jerk( function( j ) {

	j.watch_for( /^(.*)$/, function(message) {
		last_said[message.user] = message.match_data[1];
	});
		
	var replaceLastSaid = function(user, pattern, modifier, newString, say) {
		if (!last_said[user]) {
			return;
		}
		var regex = new RegExp( pattern, modifier);
		var newMessage = last_said[user].replace(regex, newString);
		if ( newMessage != last_said[user] ) {
			say('<' + user + '>: ' + newMessage);
			last_said[user] = newMessage;
		}
	}
	
	j.watch_for( /^s\/([^\/]+)\/([^\/]*)\/?(g)?$/, function(message) {
		replaceLastSaid(message.user, message.match_data[1], message.match_data[3], message.match_data[2], message.say);
    });
	
	j.watch_for( /^(.+) s\/([^\/]+)\/([^\/]*)\/?(g)?$/, function(message) {
		replaceLastSaid(message.match_data[1], message.match_data[2], message.match_data[4], message.match_data[3], message.say);
    });
	
	j.watch_for( /^([ \w]* is) ([ \w]+)[\.!]?$/, function( message ) {
		if ( Math.random() > .6 ) {
			var lower = message.match_data[1].toLowerCase();
			if ( lower.indexOf('your face') < 0 && 
				lower.indexOf('how is') < 0 && 
				lower.indexOf('why is') < 0 &&
				lower.indexOf('wtf is') < 0 &&
				lower.indexOf('where is') < 0 ) {
				say('Your face is ' + message.match_data[2], message, 2000);
			}
		}
	});
	
	j.watch_for( new RegExp('^' + options.nick + ' status (([^\\"\\s]+)|\\"(.+)\\") (\\d+)$'), function(message) {
		buildFinished(message.match_data[2] || message.match_data[3], message.match_data[4], message);
	});
	
}).connect( options );

var say = function(text, message, delay) {
	delay = delay || 0;
	setTimeout(function() {
		if ( message && message.say ) {
			message.say(text);
		}
		else {
			daJerk.say(options.channels, text);
		}
	}, delay);
};

rl.on('line', function (cmd) {
  say(cmd);
});

var http = require('http');
http.createServer(function (req, res) {
  res.writeHead(200, {'Content-Type': 'text/plain'});
  var fullBody = '';
  req.on('data', function(chunk) {
	  // append the current chunk of data to the fullBody variable
	  console.log("Received body data:");
      console.log(chunk.toString());
	  fullBody = fullBody + chunk.toString();
	});
  req.on('end', function(){
	var data;
	try {
		data = JSON.parse(fullBody);
	}
	catch(e){}
	
	if ( data && data.name && data.build && data.build.phase && data.build.phase == "FINISHED" && data.build.number ) {
		buildFinished(data.name, data.build.number);
	}
	
	
    res.end();
  });
  
}).listen(PORT, '127.0.0.1');

var buildFinished = function(jobName, buildNumber, message){
	// Grabbing error list
	var url = JENKINS_URL + '/job/' + jobName + '/' + buildNumber + '/artifact/JustErrors.log';
	http.get(url, function(res){
		res.setEncoding('utf8');
		var errorBody = '';
		if ( res.statusCode == 200 ) {
			res.on('data', function(chunk){
				errorBody += chunk.toString();
			});
			
			res.on('end', function(){
				// doing this in 'end' because 'data' won't get hit for empty JustErrors.log files
				var errors = errorBody.match(/[^\r\n]+/g);
				
				sayBuildStatus(jobName, buildNumber, errors, message);
			});
		} else {
			// looks like 'end' doesn't get hit at all for non-200s, even if I tried
			sayBuildStatus(jobName, buildNumber, [], message);
		}
	}).on("error", function(e){
	  console.log("Got error: " + e.message);
	});
}

var sayBuildStatus = function(jobName, buildNumber, errors, message) {
	jenkins.build_info(jobName, buildNumber, function(error, data) {

		if (error == null && data.statusCode == null) { // no statusCode means its not a 404
			var result = data.result;
			if ( result == 'UNSTABLE' ) {
				result = color.bold.pink(result);
			}
			if ( result == 'FAILURE' ) {
				result = color.bold.underline.red(result);
			}
			if ( result == 'SUCCESS' ) {
				result = color.green(result);
			}

			var description = data.actions[0].causes[0].shortDescription;
			var url = data.url;
			console.log(url);
			
			var branch = getLastBuiltRevision(data).branch[0].name;

			var builtOn = data.builtOn;

			var msgtext = 'Branch ' + branch + " build #" + data.number + ':' + result + ' in ' + Math.floor(data.duration / 60000) + ' min ';
			var secs = Math.floor(data.duration % 60000 / 1000);
			if ( secs > 0 ) {
				msgtext += secs + ' sec: ';
			}
			else {
				msgtext += ': ';
			}
			msgtext += data.url;
			
			say(msgtext, message);
			
			if ( data.result == 'FAILURE' && errors && (errors.length > 0) ) {
				say(errors[0], message);
				if ( errors.length == 2 ) {
					say("    " + errors[1], message);
				}
				else if ( errors.length > 2 ) {
					say("    And " + (errors.length - 1) + " other errors", message);
				}
			}
		} 
	});
}

