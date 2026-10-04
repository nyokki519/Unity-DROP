import assert from "node:assert/strict";
import { validateEventConfig } from "../src/index.js";

const config = validateEventConfig({
  eventId: 20261004,
  totalDraws: 30,
  inventory: { secret: 1, rare: 5, common: 24 }
});

assert.equal(config.totalDraws, 30);
assert.deepEqual(config.inventory, { secret: 1, rare: 5, common: 24 });
assert.throws(() => validateEventConfig({ ...config, totalDraws: 29 }), /must equal/);
assert.throws(() => validateEventConfig({ ...config, inventory: { ...config.inventory, secret: -1 } }), /secret/);

console.log("Shared pool configuration validation — OK");
