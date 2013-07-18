wendybot
========

node-js irc bot that monitors Jenkins jobs

## Requires

https://github.com/jansepar/node-jenkins-api

https://github.com/gf3/Jerk

## Usage

### setup + configurables

``` javascript

// URL of Jenkins application
var JENKINS_URL = "http://jenkins.lifelock.com";

// options for Jerk Bot -- irc server, nickname, channels to join
var options =
  { server: 'irc.freenode.com'
  , port: 6667
  , nick: 'wendy'
  , channels: [ '#devops', '#wendysroom' ]
  };
  
// interval of time in milliseconds to ping a Jenkins job for status
var TIMER = 30000;

``` 
### monitor a job

To monitor a Jenkin's job, in the IRC room, type:

> ircuser: !monitor TRUNK
>
> wendy: --- Jenkins build TRUNK SUCCESS on <build server>. Started by an SCM change | https://jenkins.domain.com/job/TRUNK/2138/ ---

wendybot will periodically ping the TRUNK job and reply with the current status of the job if a new job is in PROGRESS or if the job status has changed.

### check a job

To check a Jenkins job's current status, in the IRC room, type:

> ircuser: !check TRUNK
>
> wendy: --- Jenkins build TRUNK FAILURE on <build server>. Started by an SCM change | https://jenkins.domain.com/job/TRUNK/1000/ ---

wendybot will immediately ping the TRUNK job and reply with the current status of the job.
