const normalize = text => text.normalize('NFD').replace(/\p{Diacritic}/gu,'').toLocaleLowerCase().trim();
export function searchCities(rows, query, limit=20) {
  const terms=normalize(query).split(/\s+/).filter(Boolean);
  if (!terms.length || query.length>100) return [];
  return rows.filter(row=>terms.every(term=>normalize(`${row[0]} ${row[1]} ${row[2]} ${row[5]}`).includes(term))).slice(0,limit)
    .map(([name,ascii,country,lat,lon,zone])=>({name,country,lat,lon,zone,elevation:0}));
}
