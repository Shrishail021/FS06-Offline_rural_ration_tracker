const axios = require('axios');

const seedUsers = async () => {
  const users = [
    {
      username: 'shri_admin',
      password: 'password123',
      role: 'STATE_ADMIN',
      name: 'Shri (State Admin)'
    },
    {
      username: 'village_dist',
      password: 'password123',
      role: 'DISTRIBUTOR',
      name: 'Local Village Distributor'
    }
  ];

  console.log('Seeding initial users to the backend...');

  for (const user of users) {
    try {
      const res = await axios.post('http://localhost:5000/api/auth/register', user);
      console.log(`Success: Created ${user.username} - ${res.data.message}`);
    } catch (err) {
      console.error(`Error creating ${user.username}:`, err.response?.data?.message || err.message);
    }
  }
};

seedUsers();
