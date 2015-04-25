## autohost metrics collector
A simple autohost resource that provides a simple API for uploading metrics to be processed by metronic.

## Use
This example demonstrates the configuration required to use this library and plug in the metronic-statsd adapter.
```javascript
var host = require( 'autohost' );
var statsd = require( 'metronic-statsd' );

host.init( {
	modules: [ 'autohost-metrics-collector' ],
	...
} );

host.metrics.use( statsd );
```

## API
Provides a single API method.

### POST /api/ah/metrics
Requires metrics to be posted as an array (do not send single metrics):

```json
[
	{
		"type": "time" | "meter" | [custom value]
		"key": your metric key
		"timestamp": timestamp *must* be in ISO8901 UTC
		"value": the metric value
		"units": the unit of measure
		...
	 },
	 ...
]
```

You can include arbitrary fields as part of the metric that may be used by down-stream metric adapters.
