// Supplies: the things a room in use has (ration crates, trays, datapads, toolboxes, med kits,
// ammo, personal kit, fuel cells, sample cases, drinks; provisions, crockery, books, firewood).
// Placed after the furniture, mostly against the walls, in amounts set by the room's mood: well
// stocked when pristine or lived-in, thinned out when neglected, strewn about when ransacked.
// Each is drawn by the 'supply' generator (parts.js), so it changes with the mood too.

const S = ['scifi'];
const F = ['fantasy'];

export default function defineSupplies({ G }) {
  const sup = (id, name, settings, kind, roomTypes, extra = {}) =>
    G(id, name, settings, 'supply', { kind }, { placement: 'wall', layer: 'object', blocksMovement: false, height: 'low', supplies: true, roomTypes, max: 3, ...extra });
  sup('ration-crates', 'Ration crates', S, 'rations', ['mess-hall', 'cargo-bay', 'crew-quarters', 'cantina', 'apartment', 'market', 'airlock'], { weight: 2 });
  sup('meal-trays', 'Meal trays', S, 'tray', ['mess-hall', 'cantina', 'crew-quarters', 'apartment'], { weight: 2 });
  sup('datapads', 'Datapads', S, 'datapads', ['bridge', 'command-centre', 'lab', 'crew-quarters', 'apartment', 'security', 'server-room', 'med-bay', 'clinic']);
  sup('toolbox', 'Toolbox', S, 'toolbox', ['workshop', 'engine-room', 'hangar', 'cargo-bay', 'landing-pad', 'mine', 'server-room', 'airlock'], { weight: 2 });
  sup('med-kits', 'Med kits', S, 'medkit', ['med-bay', 'clinic', 'cloning-lab', 'airlock', 'security'], { weight: 2 });
  sup('ammo-cases', 'Ammo cases', S, 'ammo', ['armoury', 'security', 'bridge', 'hangar', 'detention'], { weight: 2 });
  sup('personal-kit', 'Personal kit', S, 'personal', ['crew-quarters', 'apartment', 'airlock']);
  sup('fuel-cells', 'Fuel cells', S, 'fuel-cells', ['engine-room', 'hangar', 'landing-pad', 'cargo-bay', 'workshop', 'mine']);
  sup('sample-cases', 'Sample cases', S, 'samples', ['lab', 'cloning-lab', 'med-bay', 'alien-ruins', 'hydroponics-bay']);
  sup('drinks-crate', 'Drinks crate', S, 'drinks', ['cantina', 'apartment', 'market', 'mess-hall']);
  sup('provisions', 'Provisions', F, 'provisions', ['kitchen', 'tavern', 'storeroom', 'cellar', 'great-hall', 'shop'], { weight: 2 });
  sup('crockery', 'Crockery', F, 'crockery', ['kitchen', 'tavern', 'great-hall']);
  sup('book-stack', 'Book stack', F, 'books', ['library', 'bedroom', 'chamber']);
  sup('firewood', 'Firewood', F, 'firewood', ['kitchen', 'tavern', 'smithy', 'bedroom', 'great-hall', 'cellar']);
}
