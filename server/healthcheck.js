const http = require('http');

const options = {
    hostname: 'localhost',
    port: process.env.PORT || 3001,
    path: '/health',
    method: 'GET'
};

const req = http.request(options, (res) => {
    if (res.statusCode === 200) {
        process.exit(0);
    } else {
        process.exit(1);
    }
});

req.on('error', () => {
    process.exit(1);
});

req.setTimeout(2000, () => {
    req.abort();
    process.exit(1);
});

req.end();