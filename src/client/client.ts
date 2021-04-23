import equal from "fast-deep-equal";

RegisterCommand(
  "gothere",
  async (_source) => SetEntityCoords(PlayerPedId(), 269.7664, -320.8406, 46.33287, true, false, false, false), false
);

type Area = {
  centerX: number;
  centerY: number;
  centerZ: number;
  width: number;
  height: number;
  rotation: number;
};

type MenuItem = {
  eventName: string;
  text: string;
  arguments: any;
};

enum EntityType {
  NoEntity,
  Ped,
  Vehicle,
  Object
}

type EntityCallback = (entityId: number, entityType: string, entityModel: number) => MenuItem[] | null;

const RADIANS = Math.PI / 180;
const entityChecks: EntityCallback[] = [];
let currentMenuItems: MenuItem[] = [];
let menuIsOpen = false;
let previousEntityId = -1;
const callbacksByResource: { [resource: string]: EntityCallback[] } = {};

const raycastInfrontOfCamera = async (distance: number = 5) => {

	const cameraCoord = GetGameplayCamCoord();
  const [ rx, _, rz ] = GetGameplayCamRot(0).map((r) => RADIANS * r);

  const destination = [
    -Math.sin(rz) * Math.abs(Math.cos(rx)), 
		Math.cos(rz) * Math.abs(Math.cos(rx)), 
		Math.sin(rx)
  ].map((direction, i) => cameraCoord[i] + direction * distance);
  
  const shapeTest = StartShapeTestSweptSphere(cameraCoord[0], cameraCoord[1], cameraCoord[2], destination[0], destination[1], destination[2], 0.3, -1, PlayerPedId(), 7);
  return GetShapeTestResult(shapeTest);
}

const unregister = () => {
  const invokingResource = GetInvokingResource();
  if (!callbacksByResource[invokingResource]) {
    return;
  }
  callbacksByResource[invokingResource].forEach((callback) => {
    const index = entityChecks.indexOf(callback);
    if (index > -1) {
      entityChecks.splice(index, 1);
    }
  })
  callbacksByResource[invokingResource] = [];
}

const registerInspectEntity = (callback: EntityCallback) => {
  const invokingResource = GetInvokingResource();
  if (!callbacksByResource[invokingResource]) {
    callbacksByResource[invokingResource] = [];
  }
  callbacksByResource[invokingResource].push(callback);
  entityChecks.push(callback)
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

  let [ retval, hit, , , entityId ] = await raycastInfrontOfCamera();

  if (retval && hit) {
    const entityType: EntityType = GetEntityType(entityId);
    if (entityType !== EntityType.NoEntity) {
      
      // we've got an entity, but it's differnet from the previous entity, so lets make sure our menu is closed
      if (menuIsOpen && entityId !== previousEntityId) {
        closeMenu();
      }

      // grab the model upfront to avoid every callback having to do it
      const entityModel = GetEntityModel(entityId);
      entityChecks.map((callback) => callback(entityId, EntityType[entityType].toLowerCase(), entityModel))
        .filter((a) => !!a)
        .flat()
        .forEach((item) => nextMenuItems.push(item))

    } else {
      entityId = -1;
    }
  } else {
    entityId = -1;
  }

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