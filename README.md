# FiveM Inspect

A simple resource that lets you register things that can be inspected.

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
  ];
});

on("gumball:use", ({ entityId, more }) => {
  console.log(entityId, more);
});


const spheres = [
  { x: -481.0639953613281, y: -402.3402404785156, z: 34.87741858066406, radius: 1.5 },
  { x: -486.3749389648475, y: -401.6337890625, z: 34.65011978149414, radius: 1.5 },
]

exports['fivem-inspect'].registerInspectSpheres(spheres, () => [{
  eventName: "cinema:enter",
  text: "Enter cinema"
}]);

on("cinema:enter", () => {
  console.log("entering cinema");
});

```