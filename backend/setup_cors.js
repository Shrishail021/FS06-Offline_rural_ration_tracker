const axios = require('axios');

async function setupCors() {
  const url = 'http://admin:shri@127.0.0.1:5984/_node/_local/_config';
  try {
    await axios.put(`${url}/httpd/enable_cors`, '"true"');
    await axios.put(`${url}/cors/origins`, '"*"');
    await axios.put(`${url}/cors/credentials`, '"true"');
    await axios.put(`${url}/cors/methods`, '"GET, PUT, POST, HEAD, DELETE"');
    await axios.put(`${url}/cors/headers`, '"accept, authorization, content-type, origin, referer, x-csrf-token"');
    console.log("CORS setup successful!");
  } catch (err) {
    console.error("Error setting up CORS:", err.message);
    if (err.response) console.error(err.response.data);
  }
}

setupCors();
