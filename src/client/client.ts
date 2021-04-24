import equal from "fast-deep-equal";

type MenuItem = {
  eventName: string;
  text: string;
  arguments?: any;
};

enum EntityType {
  NoEntity,
  Ped,
  Vehicle,
  Object
}

type Vector = {
  x: number;
  y: number;
  z: number;
}

type SphereDetails = Vector & { radius: number };

type SphereInfo = {
  spheres: SphereDetails[];
  callback: SphereCallback;
}

type EntityCallback = (entityId: number, entityType: string, entityModel: number) => MenuItem[] | null;
type SphereCallback = () => MenuItem[] | null;

const RADIANS = Math.PI / 180;
const entityCallbacks: { [resource: string]: EntityCallback[] } = {};
const sphereCallbacks: { [resource: string]: SphereInfo[] } = {};
let currentMenuItems: MenuItem[] = [];
let menuIsOpen = false;
let previousEntityId = -1;

const raycastInfrontOfCamera = async (cameraCoord: number[], cameraVec: number[]) => {
  const destination = cameraVec.map((direction, i) => cameraCoord[i] + direction * 10);
  const shapeTest = StartShapeTestSweptSphere(cameraCoord[0], cameraCoord[1], cameraCoord[2], destination[0], destination[1], destination[2], 0.3, -1, PlayerPedId(), 7);
  return GetShapeTestResult(shapeTest);
}

const unregister = () => {
  const invokingResource = GetInvokingResource();
  delete entityCallbacks[invokingResource];
  delete sphereCallbacks[invokingResource];
}

const registerInspectSpheres = (spheres: SphereDetails[], callback: SphereCallback) => {
  const invokingResource = GetInvokingResource();
  
  if (!sphereCallbacks[invokingResource]) {
    sphereCallbacks[invokingResource] = [];
  }

  sphereCallbacks[invokingResource].push({
    spheres,
    callback
  });
};

const registerInspectEntity = (callback: EntityCallback) => {
  const invokingResource = GetInvokingResource();
  
  if (!entityCallbacks[invokingResource]) {
    entityCallbacks[invokingResource] = [];
  }

  entityCallbacks[invokingResource].push(callback);
};

const closeMenu = () => {
  SendNuiMessage(JSON.stringify({
    action: "closeMenu"
  }));
  SetNuiFocus(false, false);
  menuIsOpen = false;
}

const openMenu = () => {
  SetCursorLocation(0.5, 0.5);
  SendNuiMessage(JSON.stringify({
    action: "openMenu",
    menuItems: currentMenuItems
  }));
  SetNuiFocus(true, true);
  menuIsOpen = true;
}

setInterval(async () => {
  
  const nextMenuItems = [];
  const cameraCoord = GetGameplayCamCoord();
  const playerCoords = GetEntityCoords(PlayerPedId(), true);
  const [rx, _, rz] = GetGameplayCamRot(0).map((r) => RADIANS * r);
  const cameraVec = [
    -Math.sin(rz) * Math.abs(Math.cos(rx)), 
		Math.cos(rz) * Math.abs(Math.cos(rx)), 
		Math.sin(rx)
  ];

  let [ retval, hit, , , entityId ] = await raycastInfrontOfCamera(cameraCoord, cameraVec);

  if (retval && hit) {
    const entityType: EntityType = GetEntityType(entityId);
    if (entityType !== EntityType.NoEntity) {
      
      // we've got an entity, but it's different from the previous entity, so lets make sure our menu is closed
      if (menuIsOpen && entityId !== previousEntityId) {
        closeMenu();
      }

      // grab the model upfront to avoid every callback having to do it
      const entityModel = GetEntityModel(entityId);
      Object.values(entityCallbacks)
          .flat()
          .map((callback) => callback(entityId, EntityType[entityType].toLowerCase(), entityModel))
          .filter((a) => !!a)
          .flat()
          .forEach((item) => nextMenuItems.push(item));
 
    } else {
      entityId = -1;
    }
  } else {
    entityId = -1;
  }
  
  Object.values(sphereCallbacks)
  .flat()
  .filter((sphereInfo) => 
    sphereInfo.spheres.some(({ x, y, z, radius }) => {
      
      if (Vdist2(x, y, z, playerCoords[0], playerCoords[1], playerCoords[2]) > (radius + 4) ** 2) {
        return false;
      }

      const distToSphere = Math.sqrt(
        ((x - cameraCoord[0]) ** 2) +
        ((y - cameraCoord[1]) ** 2) +
        ((z - cameraCoord[2]) ** 2)
      )
  
      const destination = cameraVec.map((direction, i) => cameraCoord[i] + direction * distToSphere);
      
      return ((x - destination[0]) ** 2) +
            ((y - destination[1]) ** 2) +
            ((z - destination[2]) ** 2) < (radius ** 2);
    })
   )
  .map((sphereInfo) => sphereInfo.callback())
  .filter((a) => !!a)
  .flat()
  .forEach((item) => nextMenuItems.push(item));

  // lets not bother sending a message to NUI if everything is identical
  if (!equal(nextMenuItems, currentMenuItems)) {
    SendNuiMessage(JSON.stringify({
      action: "setMenuItems",
      menuItems: nextMenuItems
    }));
  }

  // the menu is open but there's nothing in it (or just a single item), lets close it.
  if (menuIsOpen && nextMenuItems.length <= 1) {
    closeMenu();
  }

  previousEntityId = entityId;
  currentMenuItems = nextMenuItems;
}, 100);

// NUI has requested that we close (either through Escape or clicking off a menu)
RegisterNuiCallbackType("closeUI");
on("__cfx_nui:closeUI", ({}, cb: (res: any) => void) => {
  closeMenu();
  cb({});
});

// an item in a menu was clicked, so lets fire the event
RegisterNuiCallbackType("itemClicked");
on("__cfx_nui:itemClicked", (menuItem: MenuItem, cb: (res: any) => void) => {
  closeMenu();
  emit(menuItem.eventName, menuItem.arguments);
  cb({});
});

let enableDebug = false;
setTick(() => {
  if (enableDebug) {
    Object.values(sphereCallbacks)
    .flat()
    .map((a) => a.spheres)
    .flat()
    .forEach(({ x, y, z, radius }) => {
      DrawSphere(x, y, z, radius, 0, 255, 0, 0.2);
    })
  }
});

RegisterCommand(
  "inspect:debug",
  (_source: string, [enabled]: [string]) => {
    enableDebug = enabled === "true" || enabled === "1";
  },
  false
);

RegisterCommand(
  "+inspect",
  () => {

    // nothing to inspect. lets bail.
    if (currentMenuItems.length === 0) {
      return;
    }

    // only a single item, so lets fire that item
    if (currentMenuItems.length === 1) {
      emit(currentMenuItems[0].eventName, currentMenuItems[0].arguments);
      return;
    }
    
    // looks like we have multiple items. lets open the menu
    openMenu();
  },
  false
);

RegisterKeyMapping("+inspect", "Inspect", "keyboard", "e");

global.exports("unregister", unregister);
global.exports("registerInspectEntity", registerInspectEntity);
global.exports("registerInspectSpheres", registerInspectSpheres);