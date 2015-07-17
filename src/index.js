var process = require( "./processor" );
module.exports = function( host ) {
	return {
		urlPrefix: "/ah",
		name: "metrics",
		actions: {
			upload: {
				url: "/",
				method: "post",
				handle: function( envelope ) {
					var processed = process( host.metrics, envelope.data );
					if ( envelope.hyped ) {
						envelope.hyped( processed.data ).status( processed.status ).render();
					} else {
						envelope.reply( { data: processed.data, status: processed.status } );
					}
				}
			}
		}
	};
};
