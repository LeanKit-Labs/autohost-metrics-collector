var process = require( "./processor" );
module.exports = function( host ) {
	return {
		name: "metricsCollector",
		actions: {
			upload: {
				url: "/",
				method: "post",
				handle: function( envelope ) {
					var processed = process( host.metrics, envelope.data );
					return {
						status: processed.status,
						data: processed.data
					};
				}
			}
		}
	};
};
