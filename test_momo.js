const crypto = require('crypto');
const partnerCode = 'MOMOBKUN20180529';
const accessKey = 'klm05TvNBzhg7h7j';
const secretKey = 'at67qH6mk8w5Y1nAyMoYKMWACiEi2bsa';
const amount = '10000';
const orderId = 'MOMO_123_' + Date.now();
const requestId = orderId;
const orderInfo = 'Thanh toan don hang';
const redirectUrl = 'http://localhost:3000/payment/result';
const ipnUrl = 'http://localhost:5000/api/payment/momo/ipn';
const requestType = 'payWithMethod';
const extraData = '';
const rawSignature = `accessKey=${accessKey}&amount=${amount}&extraData=${extraData}&ipnUrl=${ipnUrl}&orderId=${orderId}&orderInfo=${orderInfo}&partnerCode=${partnerCode}&redirectUrl=${redirectUrl}&requestId=${requestId}&requestType=${requestType}`;
const signature = crypto.createHmac('sha256', secretKey).update(rawSignature).digest('hex');

const body = JSON.stringify({
    partnerCode, accessKey, requestId, amount, orderId, orderInfo,
    redirectUrl, ipnUrl, extraData, requestType, signature, lang: 'vi'
});

const https = require('https');
const req = https.request({
    hostname: 'test-payment.momo.vn',
    port: 443,
    path: '/v2/gateway/api/create',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
}, res => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => console.log('RESPONSE:', data));
});
req.write(body);
req.end();
