require( "../setup" );
var host;
var autohost = require( "autohost" );
var hyped = require( "hyped" )();
var fount = require( "fount" );
var metrics = require( "metronic" )();
var request = require( "request" );
var post = lift( request.post ).bind( request );
var halon = require( "halon" );

function createAdapter() {
	return {
		durations: [],
		metrics: [],
		convert: undefined,
		clear: function() {
			this.durations = [];
			this.metrics = [];
		},
		onMetric: function( data ) {
			if ( data.type === "time" ) {
				this.durations.push( data );
			} else {
				this.metrics.push( data );
			}
		},
		setConverter: function( convert ) {
			this.convert = convert;
		}
	};
}

function purgeCache() {
	var keys = _.where( _.keys( require.cache ), function( x ) {
		return /[\/]autohost[\/]/.test( x );
	} );
	_.each( keys, function( key ) {
		delete require.cache[ key ];
	} );
}

function setupHyped() {
	purgeCache();
	var adapter = createAdapter();
	metrics.use( adapter );
	host = hyped.createHost( autohost, {
		port: 8899,
		modules: [ "./src/index.js" ],
		fount: fount,
		metrics: metrics
	} );
	hyped.setupMiddleware( host );
	host.start();
	return adapter;
}

function setupPlain() {
	purgeCache();
	var adapter = createAdapter();
	metrics.use( adapter );
	host = autohost( {
		port: 8898,
		modules: [ "./src/index.js" ],
		fount: fount,
		metrics: metrics
	} );
	host.start();
	return adapter;
}

describe( "HTTP Metrics Collector", function() {
	var adapter;
	before( function() {
		adapter = setupPlain();
	} );

	describe( "Invalid data format", function() {
		it( "should result in a 400 error", function() {
			return post( {
				url: "http://localhost:8898/api/ah/metrics",
				json: {
					type: "time",
					units: "ms",
					key: "test.time",
					value: 10,
					metadata: {}
				},
				"Content-Type": "application/json"
			} )
				.then( function( x ) {
					x[ 0 ].statusCode.should.equal( 400 );
					x[ 1 ].should.eql( { error: "Metrics must be submitted as an array" } );
				} );
		} );

		after( function() {
			adapter.clear();
		} );
	} );

	describe( "Valid data format", function() {
		var result;
		before( function() {
			return post( {
				url: "http://localhost:8898/api/ah/metrics",
				json: [
					{
						type: "time",
						units: "ms",
						key: "test.time",
						value: 10,
						metadata: {}
					},
					{
						type: "meter",
						units: "",
						key: "test.meter",
						value: 1,
						metadata: {
							flag: true
						}
					},
					{
						type: "custom",
						units: "",
						key: "test.custom",
						value: 10,
						metadata: {
							one: 1,
							two: 2
						}
					},
					{
						type: "bad",
						units: "",
						key: "invalid"
					}
				],
				"Content-Type": "application/json"
			} )
				.then( function( x ) {
					result = x[ 1 ];
				} );
		} );

		it( "should return correct counts", function() {
			result.should.eql( {
				processed: 3,
				invalid: 1
			} );
		} );

		it( "should pass valid metrics to adapter", function() {
			_.omit( adapter.durations[ 0 ], "timestamp" ).should.eql(
				{
					type: "time",
					units: "ms",
					key: "test.time",
					value: 10
				}
			);

			_.map( adapter.metrics.slice( 0, 2 ), function( x ) {
				return _.omit( x, "timestamp" );
			} ).should.eql( [
				{
					type: "meter",
					units: "",
					key: "test.meter",
					value: 1,
					flag: true
				},
				{
					type: "custom",
					units: "",
					key: "test.custom",
					value: 10,
					one: 1,
					two: 2
				}
			] );
		} );
	} );

	after( function() {
		adapter.clear();
		host.metrics.removeAdapters();
		host.stop();
	} );
} );

describe( "Hypermedia Metrics Collector", function() {
	var adapter, client;
	before( function( done ) {
		adapter = setupHyped();
		client = halon( {
			root: "http://localhost:8899/api",
			adapter: halon.requestAdapter( request ) } );
		client.connect()
			.then( function( c ) {
				client = c;
				done();
			} );
	} );

	describe( "Invalid data format", function() {
		it( "should result in a 400 error", function() {
			return client.metrics.upload( {} )
				.then( null, function( x ) {
					_.omit( x, "upload" )
						.should.eql( {
						_origin: { method: "POST", href: "/api/ah/metrics/" },
						_resource: "metrics",
						_action: "upload",
						_links: {
							upload: { method: "POST", href: "/api/ah/metrics/" }
						},
					status: 400,
					error: "Metrics must be submitted as an array" } );
				} );
		} );

		after( function() {
			adapter.clear();
		} );
	} );

	describe( "Valid data format", function() {
		var result;
		before( function() {
			return client.metrics.upload( [
				{
					type: "time",
					units: "ms",
					key: "hyped.time",
					value: 10,
					metadata: {}
				},
				{
					type: "meter",
					units: "",
					key: "hyped.meter",
					value: 1,
					metadata: {
						flag: true
					}
				},
				{
					type: "custom",
					units: "",
					key: "hyped.custom",
					value: 10,
					metadata: {
						one: 1,
						two: 2
					}
				},
				{
					type: "bad",
					units: "",
					key: "invalid",
				}
			] )
				.then( function( x ) {
					result = x;
				} );
		} );

		it( "should return correct counts", function() {
			_.omit( result, "upload" )
				.should.eql( {
				_origin: { method: "POST", href: "/api/ah/metrics/" },
				_resource: "metrics",
				_action: "upload",
				_links: {
					upload: { method: "POST", href: "/api/ah/metrics/" }
				},
				status: 202,
				processed: 3,
				invalid: 1
			} );
		} );

		it( "should pass valid metrics to adapter", function() {
			_.omit( adapter.durations[ 0 ], "timestamp" ).should.eql(
				{
					type: "time",
					units: "ms",
					key: "hyped.time",
					value: 10
				}
			);

			_.map( adapter.metrics.slice( 0, 2 ), function( x ) {
				return _.omit( x, "timestamp" );
			} ).should.eql( [
				{
					type: "meter",
					units: "",
					key: "hyped.meter",
					value: 1,
					flag: true
				},
				{
					type: "custom",
					units: "",
					key: "hyped.custom",
					value: 10,
					one: 1,
					two: 2
				}
			] );
		} );
	} );

	after( function() {
		adapter.clear();
		host.metrics.removeAdapters();
		host.stop();
	} );
} );
