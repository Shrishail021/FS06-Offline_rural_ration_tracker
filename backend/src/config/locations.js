// Karnataka Location Hierarchy Data
// State → District → Taluk → Village
const KARNATAKA_LOCATIONS = [
  {
    state: 'Karnataka',
    districts: [
      {
        name: 'Dharwad',
        code: 'DH',
        taluks: [
          { name: 'Hubli', code: 'HU', villages: ['Hubli Central', 'Gokul', 'Vidyanagar', 'Keshwapur', 'Unkal'] },
          { name: 'Dharwad', code: 'DW', villages: ['Dharwad City', 'Amargol', 'Sattur', 'Hosur'] },
          { name: 'Kalghatgi', code: 'KG', villages: ['Kalghatgi', 'Hirekerur', 'Mugad', 'Kalaghatagi'] },
        ]
      },
      {
        name: 'Belagavi',
        code: 'BL',
        taluks: [
          { name: 'Belagavi', code: 'BL', villages: ['Belagavi North', 'Belagavi South', 'Kakati', 'Hukeri'] },
          { name: 'Gokak', code: 'GK', villages: ['Gokak', 'Mudalagi', 'Satti', 'Ankali'] },
          { name: 'Chikkodi', code: 'CH', villages: ['Chikkodi', 'Nippani', 'Ugarakhurd', 'Kanakumbi'] },
        ]
      },
      {
        name: 'Gadag',
        code: 'GA',
        taluks: [
          { name: 'Gadag', code: 'GA', villages: ['Gadag City', 'Betgeri', 'Lakshmeshwar'] },
          { name: 'Ron', code: 'RN', villages: ['Ron', 'Masudi', 'Gajendragad'] },
          { name: 'Shirhatti', code: 'SH', villages: ['Shirhatti', 'Naregal', 'Laxmeshwara'] },
        ]
      },
      {
        name: 'Mysuru',
        code: 'MY',
        taluks: [
          { name: 'Mysuru', code: 'MY', villages: ['Mysuru City', 'Vijayanagara', 'Hebbal', 'Srirampura'] },
          { name: 'Hunsur', code: 'HN', villages: ['Hunsur', 'Piriyapatna', 'Antharasante'] },
          { name: 'Nanjangud', code: 'NJ', villages: ['Nanjangud', 'Varuna', 'Hedathale'] },
        ]
      },
      {
        name: 'Ballari',
        code: 'BA',
        taluks: [
          { name: 'Ballari', code: 'BA', villages: ['Ballari City', 'Kampli', 'Siruguppa'] },
          { name: 'Hospet', code: 'HP', villages: ['Hospet', 'Munirabad', 'Hampi'] },
          { name: 'Sandur', code: 'SA', villages: ['Sandur', 'Daroji', 'Kupgal'] },
        ]
      },
    ]
  }
];

module.exports = { KARNATAKA_LOCATIONS };
