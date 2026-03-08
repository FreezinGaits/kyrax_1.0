const http = require('http');

async function test(msg) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ message: msg });
    const req = http.request({
      hostname: 'localhost', port: 5000, path: '/api/chat',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
      timeout: 120000,
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          console.log(`\n✅ TEST: "${msg}"`);
          console.log(`   REPLY: "${json.text?.substring(0, 300)}"`);
          resolve(json);
        } catch(e) {
          console.log(`\n❌ PARSE ERROR for "${msg}": ${body.substring(0, 300)}`);
          reject(e);
        }
      });
    });
    req.on('error', e => { console.log(`\n❌ NET ERROR for "${msg}": ${e.message}`); reject(e); });
    req.write(data);
    req.end();
  });
}

(async () => {
  await test('Jarvis open Spotify and play balachaur');
})();
