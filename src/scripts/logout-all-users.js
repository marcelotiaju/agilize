// scripts/logout-all-users.js
// const fetch = require('node-fetch');

async function logoutAllUsers() {
    try {
        const response = await fetch(`http://localhost:3000/api/logout-all`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.NEXTAUTH_SECRET}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            console.log('✅ Sucesso:', data.message);
        } else {
            const error = await response.json();
            console.error('❌ Erro:', error.error);
        }
    } catch (error) {
        console.error('❌ Erro na requisição:', error.message);
    }
}

logoutAllUsers();