import pokemon from './pokemon_data.json' with { type: 'json' };
import champions from './cobbleverse_champions.json' with { type: 'json' };
import structures from './cobbleverse_structures.json' with { type: 'json' };
import legendaries from './legendaries.json' with { type: 'json' };

const data = {
    legendaries: legendaries,
    champions: champions,
    pokemon,
    structures,
};

export default {
    legendaries,
    champions,
    pokemon,
    structures
};