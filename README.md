# FiveM Inspect

A simple resource that lets you register things that can be inspected.
Currently only supports peds/vehicles/objects.

## Example usage


```javascript
// clear any callbacks registered by this resource (incase of restart)
exports['fivem-inspect'].unregister();

const gumballMachines = [
  GetHashKey("prop_gumball_01"),
  GetHashKey("prop_gumball_02"),
  GetHashKey("prop_gumball_03")
];


exports['fivem-inspect'].registerInspectEntity((entityId, type, model) => {

  // if it's not an object and not a gumball machine, return nothing.
  if (type !== "object" || !gumballMachines.includes(model)) {
    return;
  }

  // return a list of actions.
  return [
    {
      text: "Use Gumball machine",
      eventName: "gumball:use",
      arguments: {
        entityId,
        more: "data"
      }
    }
  ]
});

on("gumball:use", ({ entityId, more }) => {
  console.log(entityId, more);
});

```