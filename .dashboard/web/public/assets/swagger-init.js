'use strict';

window.addEventListener('DOMContentLoaded', () => {
	const errEl = document.getElementById('swagger-error');
	function showError(msg) {
		if (!errEl) return;
		errEl.hidden = false;
		errEl.textContent = msg;
	}

	if (typeof SwaggerUIBundle !== 'function') {
		showError('Swagger UI failed to load. Check /assets/swagger-ui/swagger-ui-bundle.js');
		return;
	}

	window.ui = SwaggerUIBundle({
		url: '/api/openapi.json',
		dom_id: '#swagger-ui',
		deepLinking: true,
		presets: [SwaggerUIBundle.presets.apis],
		layout: 'BaseLayout',
		persistAuthorization: true,
		onComplete() {
			if (errEl) errEl.hidden = true;
		},
		onFailure(err) {
			showError(err?.message || 'Failed to load OpenAPI spec from /api/openapi.json');
		},
	});
});
