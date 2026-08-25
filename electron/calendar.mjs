const MELBOURNE_TIME_ZONE='Australia/Melbourne';

export function australiaDate(date=new Date()){
  const parts=new Intl.DateTimeFormat('en-AU',{timeZone:MELBOURNE_TIME_ZONE,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date);
  const value=type=>parts.find(part=>part.type===type)?.value||'';
  return `${value('year')}-${value('month')}-${value('day')}`;
}

export function australiaMonth(date=new Date()){
  return australiaDate(date).slice(0,7);
}
