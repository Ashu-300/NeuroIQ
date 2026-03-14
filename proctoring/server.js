const { createApp } = require('./src/app');
const settings = require('./src/config/config');

const { app, server } = createApp();

server.listen(settings.SERVICE_PORT, () => {
	console.log(`🚀 ${settings.SERVICE_NAME} listening on port ${settings.SERVICE_PORT}`);
});

module.exports = app;
