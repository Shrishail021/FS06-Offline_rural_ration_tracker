// Karnataka Location Hierarchy — shared across both frontend apps
// State → District → Taluk → Villages

export const KARNATAKA_LOCATIONS = [
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
        ],
      },
      {
        name: 'Belagavi',
        code: 'BL',
        taluks: [
          { name: 'Belagavi', code: 'BL', villages: ['Belagavi North', 'Belagavi South', 'Kakati', 'Hukeri'] },
          { name: 'Gokak', code: 'GK', villages: ['Gokak', 'Mudalagi', 'Satti', 'Ankali'] },
          { name: 'Chikkodi', code: 'CH', villages: ['Chikkodi', 'Nippani', 'Ugarakhurd', 'Kanakumbi'] },
        ],
      },
      {
        name: 'Gadag',
        code: 'GA',
        taluks: [
          { name: 'Gadag', code: 'GA', villages: ['Gadag City', 'Betgeri', 'Lakshmeshwar'] },
          { name: 'Ron', code: 'RN', villages: ['Ron', 'Masudi', 'Gajendragad'] },
          { name: 'Shirhatti', code: 'SH', villages: ['Shirhatti', 'Naregal', 'Laxmeshwara'] },
        ],
      },
      {
        name: 'Mysuru',
        code: 'MY',
        taluks: [
          { name: 'Mysuru', code: 'MY', villages: ['Mysuru City', 'Vijayanagara', 'Hebbal', 'Srirampura'] },
          { name: 'Hunsur', code: 'HN', villages: ['Hunsur', 'Piriyapatna', 'Antharasante'] },
          { name: 'Nanjangud', code: 'NJ', villages: ['Nanjangud', 'Varuna', 'Hedathale'] },
        ],
      },
      {
        name: 'Ballari',
        code: 'BA',
        taluks: [
          { name: 'Ballari', code: 'BA', villages: ['Ballari City', 'Kampli', 'Siruguppa'] },
          { name: 'Hospet', code: 'HP', villages: ['Hospet', 'Munirabad', 'Hampi'] },
          { name: 'Sandur', code: 'SA', villages: ['Sandur', 'Daroji', 'Kupgal'] },
        ],
      },
      {
        name: 'Tumakuru',
        code: 'TU',
        taluks: [
          { name: 'Tumakuru', code: 'TU', villages: ['Tumakuru City', 'Devarayanadurga', 'Pavagada'] },
          { name: 'Tiptur', code: 'TI', villages: ['Tiptur', 'Gubbi', 'Koratagere'] },
        ],
      },
      {
        name: 'Dakshina Kannada',
        code: 'DK',
        taluks: [
          { name: 'Mangaluru', code: 'MN', villages: ['Mangaluru City', 'Ullal', 'Mulki', 'Bajpe'] },
          { name: 'Puttur', code: 'PU', villages: ['Puttur', 'Sullia', 'Kadaba'] },
        ],
      },
      {
        name: 'Shivamogga',
        code: 'SM',
        taluks: [
          { name: 'Shivamogga', code: 'SM', villages: ['Shivamogga City', 'Bhadravati', 'Sagar'] },
          { name: 'Thirthahalli', code: 'TH', villages: ['Thirthahalli', 'Agumbe', 'Mandagadde'] },
        ],
      },
    ],
  },
];

/** Flat list of all { code, state, district, taluk, village } */
export const getFlatLocations = () => {
  const flat = [];
  KARNATAKA_LOCATIONS[0].districts.forEach((dist) => {
    dist.taluks.forEach((taluk) => {
      taluk.villages.forEach((village, vi) => {
        flat.push({
          code: `KA-${dist.code}-${taluk.code}-${String(vi + 1).padStart(3, '0')}`,
          state: 'Karnataka',
          district: dist.name,
          taluk: taluk.name,
          village,
          label: `${village} (${dist.name})`,
        });
      });
    });
  });
  return flat;
};

/** All unique district names */
export const getDistricts = () => KARNATAKA_LOCATIONS[0].districts.map((d) => d.name);

/** Villages for a given district name */
export const getVillagesForDistrict = (districtName) => {
  const district = KARNATAKA_LOCATIONS[0].districts.find((d) => d.name === districtName);
  if (!district) return [];
  return district.taluks.flatMap((t) => t.villages);
};

/** Flat district→villages map */
export const KA_DISTRICTS = Object.fromEntries(
  KARNATAKA_LOCATIONS[0].districts.map((d) => [
    d.name,
    d.taluks.flatMap((t) => t.villages),
  ])
);

/** Given a village name, find its district */
export const getDistrictForVillage = (villageName) => {
  for (const district of KARNATAKA_LOCATIONS[0].districts) {
    for (const taluk of district.taluks) {
      if (taluk.villages.includes(villageName)) return district.name;
    }
  }
  return null;
};
