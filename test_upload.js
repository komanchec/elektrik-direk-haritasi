const fs = require('fs');
const FormData = require('form-data');
const fetch = require('node-fetch');

async function test() {
    try {
        const login = await fetch('http://localhost:3000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'admin', password: 'admin123' })
        });
        const loginData = await login.json();
        const token = loginData.token;

        const formData = new FormData();
        formData.append('gpx', fs.createReadStream('ornek_kml.kml'));

        const response = await fetch('http://localhost:3000/api/direkler/gpx-import/1', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + token
            },
            body: formData
        });

        const data = await response.json();
        console.log(data);
    } catch (e) {
        console.error(e);
    }
}
test();
