const http = require('http');

const data = JSON.stringify({ message: "Call Gautam Sharma and tell him that I'm busy today" });

const req = http.request({
  hostname: 'localhost', port: 5000, path: '/api/chat',
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
  timeout: 60000,
}, (res) => {
  let body = '';
  res.on('data', c => body += c);
  res.on('end', () => {
    try {
      const j = JSON.parse(body);
      console.log('REPLY:', j.text);
    } catch(e) {
      console.log('RAW:', body.substring(0, 800));
    }
  });
});
req.on('error', e => console.error('ERR:', e.message));
req.write(data);
req.end();
