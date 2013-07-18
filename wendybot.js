var jerk = require( 'jerk' ), sys=require('sys');
var jenkinsapi = require('./jenkins.api.js');

var JENKINS_URL = "http://jenkins.domain.com";

// options for Jerk Bot
var options =
  { server: 'irc.freenode.com'
  , port: 6667
  , nick: 'wendy'
  , channels: [ '#wendysroom' ]
  };

// interval of time in milliseconds to ping a Jenkins job for status
var TIMER = 30000;

// example object representing a build
var build_object = 
  {
		jobname: 'TRUNK',
		valid: true,
		number: 0,
		inProgress: false
	};

// map containing builds to monitor
var buildmap = {};

var jenkins = jenkinsapi.init(JENKINS_URL);

var daJerk = jerk( function( j ) {

	// timed status monitor on 'build' jobs
	j.watch_for( '^!monitor (.*)', function( message ) {
		console.log('#### call to monitor job ####');

		var job = message.match_data[1];

		console.log('monitor build status: ' + job);

		if (buildmap[job] != null && buildmap[job].valid == false) {
			message.say('--- Unknown Jenkins job: ' + job + ' ---');
			return;
		}

		// get build
		jenkins.last_build_info(job, function(error, data) {

			if (error == true ) {
				// job does not exist
				message.say('--- Unknown Jenkins job: ' + job + ' ---');

				buildmap[job] = 
					{
						jobname: job,
						valid: false,
						number: 0,
						inProgress: false
					}

				return;
			} else if (buildmap[job] != null && buildmap[job].valid == true ) {
				// job is already monitored
				message.say('--- Already monitoring job: ' + job + ' ---');
			} else {
				// start monitoring this job
				message.say('--- Start monitoring job: ' + job + ' ---');

				buildmap[job] = {
					jobname: job,
					valid: true,
					number: data.number,
					inProgress: false
				}

				// kick off the timer initially
				setInterval( function() {
					jenkins.last_build_by_number(job, buildmap[job].number, function(error, data) {

						if (error == null && data.statusCode == null) { // no statusCode means its not a 404
							var result = data.result;

							var description = data.actions[0].causes[0].shortDescription;
							var url = data.url;

							// build is in progress, mark it as in progress
							if (result == null) {
								var msgtext = '--- Jenkins build ' + job + ' ' + buildmap[job].number + 
									' IN PROGRESS. ' + description + ' | ' + url + ' ---';

								console.log(msgtext);

								if (buildmap[job].inProgress == false) {
									message.say(msgtext);
									buildmap[job].inProgress = true;
								}

								return;
							}

							var builtOn = data.builtOn;

							var msgtext = '--- Jenkins build ' + job + ' ' + result + ' ' +
								'on ' + builtOn + '. ' + description + ' | ' + url + ' ---';
							
							message.say(msgtext);

							buildmap[job].number = buildmap[job].number + 1;

							buildmap[job].inProgress = false;

						} else {
							console.log('--- ' + 'waiting on next ' + job + ' job ' + buildmap[job].number + ' in ' + (TIMER / 1000) + ' seconds ---');
						}
					});
				}, TIMER);
			}	

		});
	});

	// one time status check on 'build' job
	j.watch_for( '^!check (.*)', function( message ) {
		console.log('#### call to check job ####');

		var job = message.match_data[1];
		
		console.log('check build status: ' + job);

		jenkins.last_build_info(job, function(error, data) {

			if (error == true) {
				message.say('--- Unknown job: ' + job);
				return;
			}

			var result = data.result;
			if (result == null) {
				result = 'IN PROGRESS';
			}

			var description = data.actions[0].causes[0].shortDescription;
			var builtOn = data.builtOn;
			var url = data.url;
			var number = data.number;

			var msgtext = '--- Jenkins build ' + job + ' ' + result + ' ' +
				'on ' + builtOn + '. ' +  description + ' | ' + url + ' ---';
			console.log(data);
			console.log('IRC-msg: ' + msgtext);    
			message.say(msgtext);
		});
	});

	// display help info
	j.watch_for('!help', function( message ) {
		message.say('--- !check [JOBNAME] > performs a one time check on Jenkins job [JOBNAME] ---');
		message.say('--- !monitor [JOBNAME] > periodically monitors Jenkins job [JOBNAME] ---');
	});

}).connect( options );
