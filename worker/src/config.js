const TIERS=["secret","rare","common"];
function validateEventConfig(value) {
  if (!value || !Number.isSafeInteger(value.eventId) || value.eventId < 1) throw new Error("Invalid eventId");
  const poolRevision = value.poolRevision == null ? 0 : value.poolRevision;
  if (!Number.isSafeInteger(poolRevision) || poolRevision < 0 || poolRevision > 99) throw new Error("Invalid poolRevision");
  if (!Number.isSafeInteger(value.totalDraws) || value.totalDraws < 1) throw new Error("Invalid totalDraws");
  const inventory = {};
  for (const tier of TIERS) {
    if (!Number.isSafeInteger(value.inventory?.[tier]) || value.inventory[tier] < 0) throw new Error(`Invalid ${tier} inventory`);
    inventory[tier] = value.inventory[tier];
  }
  if (TIERS.reduce((sum, tier) => sum + inventory[tier], 0) !== value.totalDraws) throw new Error("Inventory must equal totalDraws");
  return { eventId: value.eventId, poolRevision, totalDraws: value.totalDraws, inventory };
}

function currentJstEventId(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return Number(`${values.year}${values.month}${values.day}`);
}


export {validateEventConfig,currentJstEventId};
