var _ = require( "lodash" );
function processData( metrics, data ) {
	if ( data && _.isArray( data ) ) {
		return {
			data: processMetrics( metrics, data ),
			status: 202
		};
	} else {
		return {
			data: {
				error: "Metrics must be submitted as an array"
			},
			status: 400
		};
	}
}

function processMetrics( metrics, data ) {
	return _.reduce( data, function( acc, metric ) {
		if ( metric.type && metric.key && metric.value ) {
			metrics.emitMetric( metric.type, metric.units, metric.key, metric.value, metric.metadata );
			acc.processed++;
		} else {
			acc.invalid++;
			// log bad format
		}
		return acc;
	}, { processed: 0, invalid: 0 } );
}

module.exports = processData;
