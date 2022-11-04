const rnd = require('seedrandom');

class Recipe {
    constructor(items, result) {
        this.items = items;
        this.result = result;
    }
}

class Item {
    constructor(name, tags=[], prop={}) {
        this.name = name;
        this.id = name.toLowerCase().replace(/ /g, '_');
        this.prop = prop;
        this.tags = tags;
        // this.generateRecipes();
    }
    getEmoji () {
        return this.tags.includes('worm') ? '<:worm:854382757663866920>'
               : null;
    }
}

class Material {
    constructor(name, hardness, tags=[], prop={}) {
        this.name = name;
        this.id = name.toLowerCase().replace(/ /g, '_');
        this.hardness = hardness;
        this.prop = prop;
        this.tags = tags;
        this.generateRecipes();
    }
    generateRecipes() {
        this.recipes = [];
        if (this.tags.includes('toolCraftable')) {
            this.recipes.push(new Recipe([[this.id, 20]], new Tool(`${this.name.toLowerCase()} Pickaxe`, `pickaxe`, ~~(this.hardness/2), this.hardness, this.prop.groups)));
            this.recipes.push(new Recipe([[this.id, 20]], new Tool(`${this.name.toLowerCase()} Axe`, `axe`, ~~(this.hardness/2), this.hardness, this.prop.groups)));
            this.recipes.push(new Recipe([[this.id, 20]], new Tool(`${this.name.toLowerCase()} Rod`, `rod`, ~~(this.hardness/2), this.hardness, this.prop.groups)));
        }
    }
    canSpawn (uuid) {
        return this.tags.includes('spawnable') && rnd(`${this.id}_${uuid}`)() <= 0.5;
    }
    canBeMined () {
        return this.tags.includes('stone') || this.tags.includes('ore') || this.tags.includes('gem')
    }
    canBeChopped () {
        return this.tags.includes('wood') || this.tags.includes('bamboo')
    }
    getEmoji () {
        return this.tags.includes('stone') ? '<:rock:854017735947321384>'
               : (this.tags.includes('ore') ? '<:ore:854017735922024489>'
               : (this.tags.includes('gem') ? '<:gem:854017735830143008>'
               : (this.tags.includes('wood') ? '<:wood:854020270833664011>'
               : (this.tags.includes('bamboo') ? '<:bamboo:854350298473562172>'
               : null))));
    }
}

class Tool {
    constructor (name, type, eff, dur, groups) {
        this.name = name;
        this.id = name.toLowerCase().replace(/ /g, '_');
        this.type = type;
        this.eff = eff;
        this.dur = dur;
        this.groups = groups;
    }
    canMine (material) {
        material = material.id || material
        for (let group of this.groups)
            for (let item of groups[group])
                if (item == material)
                    return true;
        return false;
    }
}

const groups = {
    stone: ['stone', 'granite', 'diorite', 'andesite', 'tuff', 'basalt', 'limestone', 'marble'],
    ore_1: ['lead', 'copper', 'tin', 'aluminium', 'iron'],
    ore_2: ['silver', 'tungsten', 'zinc'],
    ore_3: ['platinum'],
    ore_4: ['cobalt'],
    ore_5: ['palladium'],
    ore_6: ['titanium'],
    gem: ['beryl', 'chrysoberyl', 'corundum', 'diamond', 'feldspar', 'garnet', 'jade', 'lazurite', 'olivine', 'opal', 'quartz', 'spinel', 'topaz', 'tourmaline', 'turquoise', 'zircon']
}

const items = {
    worm: new Item("Worm", ['bait', 'worm'], {eff: 20}),
    caterpillar: new Item("Caterpillar", ['bait', 'worm'], {eff: 30}),
    fatworm: new Item("FatWorm", ['bait', 'worm'], {eff: 40})
}

const materials = {
    stone: new Material("Stone", 40, ['spawnable', 'stone'], {rarity: 0.5}),
    granite: new Material("Granite", 40, ['spawnable', 'stone'], {rarity: 0.5}),
    diorite: new Material("Diorite", 40, ['spawnable', 'stone'], {rarity: 0.7}),
    andesite: new Material("Andesite", 40, ['spawnable', 'stone'], {rarity: 0.5}),
    tuff: new Material("Tuff", 40, ['spawnable', 'stone'], {rarity: 0.6}),
    basalt: new Material("Basalt", 40, ['spawnable', 'stone'], {rarity: 0.7}),
    limestone: new Material("Limestone", 40, ['spawnable', 'stone'], {rarity: 0.4}),
    marble: new Material("Marble", 40, ['spawnable', 'stone'], {rarity: 0.4}),
    
    lead: new Material("Lead", 38, ['spawnable', 'ore', 'toolCraftable'], {rarity: 0.7, groups: ['stone', 'ore_1']}),
    copper: new Material("Copper", 40, ['spawnable', 'ore', 'toolCraftable'], {rarity: 0.9, groups: ['stone', 'ore_1']}),
    tin: new Material("Tin", 50, ['spawnable', 'ore', 'toolCraftable'], {rarity: 0.8, groups: ['stone', 'ore_1']}),
    coal: new Material("Coal", 50, ['spawnable', 'ore'], {rarity: 0.6}),
    aluminium: new Material("Aluminium", 160, ['spawnable', 'ore', 'toolCraftable'], {rarity: 0.3, groups: ['stone', 'ore_1']}),
    gold: new Material("Gold", 188, ['spawnable', 'ore'], {rarity: 0.3}),
    iron: new Material("Iron", 200, ['spawnable', 'ore', 'toolCraftable'], {rarity: 0.6, groups: ['stone', 'ore_1', 'ore_2', 'gem']}),
    silver: new Material("Silver", 206, ['spawnable', 'ore', 'toolCraftable'], {rarity: 0.5, groups: ['stone', 'ore_1', 'ore_2', 'gem']}),
    tungsten: new Material("Tungsten", 310, ['spawnable', 'ore', 'toolCraftable'], {rarity: 0.4, groups: ['stone', 'ore_1', 'ore_2', 'ore_3', 'gem']}),
    zinc: new Material("Zinc", 327, ['spawnable', 'ore', 'toolCraftable'], {rarity: 0.3, groups: ['stone', 'ore_1', 'ore_2', 'ore_3', 'gem']}),
    platinum: new Material("Platinum", 900, ['spawnable', 'ore', 'toolCraftable'], {rarity: 0.3, groups: ['stone', 'ore_1', 'ore_2', 'ore_3', 'ore_4', 'gem']}),
    cobalt: new Material("Cobalt", 1043, ['spawnable', 'ore'], {rarity: 0.2, groups: ['stone', 'ore_1', 'ore_2', 'ore_3', 'ore_4', 'ore_5', 'gem']}),
    palladium: new Material("Palladium", 1400, ['spawnable', 'ore'], {rarity: 0.2, groups: ['stone', 'ore_1', 'ore_2', 'ore_3', 'ore_4', 'ore_5', 'ore_6', 'gem']}),
    titanium: new Material("Titanium", 1830, ['spawnable', 'ore', 'toolCraftable'], {rarity: 0.2, groups: ['stone', 'ore_1', 'ore_2', 'ore_3', 'ore_4', 'ore_5', 'ore_6', 'gem']}),

    beryl: new Material("Beryl", 200, ['spawnable', 'gem'], {rarity: 0.5}),
    chrysoberyl: new Material("Chrysoberyl", 200, ['spawnable', 'gem'], {rarity: 0.5}),
    corundum: new Material("Corundum", 200, ['spawnable', 'gem'], {rarity: 0.5}),
    diamond: new Material("Diamond", 200, ['spawnable', 'gem'], {rarity: 0.2}),
    feldspar: new Material("Feldspar", 200, ['spawnable', 'gem'], {rarity: 0.3}),
    garnet: new Material("Garnet", 200, ['spawnable', 'gem'], {rarity: 0.5}),
    jade: new Material("Jade", 200, ['spawnable', 'gem'], {rarity: 0.2}),
    lazurite: new Material("Lazurite", 200, ['spawnable', 'gem'], {rarity: 0.4}),
    olivine: new Material("Olivine", 200, ['spawnable', 'gem'], {rarity: 0.7}),
    opal: new Material("Opal", 200, ['spawnable', 'gem'], {rarity: 0.3}),
    quartz: new Material("Quartz", 200, ['spawnable', 'gem'], {rarity: 0.7}),
    spinel: new Material("Spinel", 200, ['spawnable', 'gem'], {rarity: 0.4}),
    topaz: new Material("Topaz", 200, ['spawnable', 'gem'], {rarity: 0.2}),
    tourmaline: new Material("Tourmaline", 200, ['spawnable', 'gem'], {rarity: 0.2}),
    turquoise: new Material("Turquoise", 200, ['spawnable', 'gem'], {rarity: 0.7}),
    zircon: new Material("Zircon", 200, ['spawnable', 'gem'], {rarity: 0.6}),
    amethyst: new Material("Amethyst", 200, ['spawnable', 'gem'], {rarity: 0.6}),

    cedar: new Material("Cedar", 50, ['spawnable', 'wood'], {rarity: 0.8}),
    fir: new Material("Fir", 50, ['spawnable', 'wood'], {rarity: 0.4}),
    spruce: new Material("Spruce", 50, ['spawnable', 'wood'], {rarity: 0.2}),
    ash: new Material("Ash", 50, ['spawnable', 'wood'], {rarity: 0.8}),
    alder: new Material("Alder", 50, ['spawnable', 'wood'], {rarity: 0.4}),
    oak: new Material("Oak", 50, ['spawnable', 'wood'], {rarity: 0.6}),
    olive: new Material("Olive", 50, ['spawnable', 'wood'], {rarity: 0.2}),
    palm: new Material("Palm", 50, ['spawnable', 'wood'], {rarity: 0.5}),
    birch: new Material("Birch", 50, ['spawnable', 'wood'], {rarity: 0.5}),
    bamboo: new Material("Bamboo", 50, ['spawnable', 'bamboo'], {rarity: 0.2}),
}

module.exports = {materials, groups, Tool, Recipe, Material, items};