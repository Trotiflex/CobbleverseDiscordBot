import pokemon from '../src/data/pokemon_data.json' with { type: 'json' };
import champions from '../src/data/cobbleverse_champions.json' with { type: 'json' };
import structures from '../src/data/cobbleverse_structures.json' with { type: 'json' };
import legendaries from '../src/data/legendaries.json' with { type: 'json' };
import starter from '../src/data/starter.json' with { type: 'json' };

const data = {
    legendaries: legendaries,
    champions: champions,
    pokemon,
    starter,
    structures,
};

export default {
    legendaries,
    champions,
    pokemon,
    starter,
    structures
};