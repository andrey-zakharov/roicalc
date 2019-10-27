import {Action, getModule, Module, Mutation, MutationAction, VuexModule} from 'vuex-module-decorators';
import store from './index';
import languages from '@/assets/languages.json';
import {Vue} from 'vue-property-decorator';
import Fraction from 'fraction.js/fraction';
import axios from 'axios';

export interface Building {
  id: number;
  name: string;
  displayName: string;
  description: string;
  baseCost: number;
  category: string;
  svgIcon: string;
  constructionBarIcon: string;
  buildingPanelHeaderImage: string;
  tags: string[];
  availableRecipes: number[];
  upkeep?: {
    totalMonthlyUpkeep?: number;
  };
  moduleUpkeep?: number;
}

export interface ProductDefinition {
  id: number; // id in array of prods
  name: string;
  displayName: string;
  productCategory: string; // id
  endGameProduct: boolean;
  disableContracts: boolean;
  svgIcon: string;
  tags: string[];
  recipes: number[];
  price: string; // formula
}

export interface ProductCategory {
  name: string;
  uiOrder: number;
  categoryName: string;
  parentCategory: string;
  priceMultiplier: number;
  growthMultiplier: number;
}

export interface Product {
  id: number;
  amount: number;
}

export interface Recipe {
  id: number; // internal
  name: string;
  displayName: string;
  description: string;
  gameDays: number;
  excludeInRecipeGraph: boolean;
  waterResources: boolean;
  requiredModules: Array<{ buildingName: string }>;
  ingredients: Product[];
  result: Product[];
  tier: number;
  svgIcon: string;
  building: number;
}

export interface Target {
  id: number; // product
  amount: number;
  days: number;
  demand: number; // relative to 1.0
}

export interface Result {
  [key: number]: Fraction; // recipeId => flow
}

export interface IAppState {
  theme: string;
  targets: Product[]; // target
  products: Readonly<ProductDefinition[]>;
  recipes: Readonly<Recipe[]>;
  buildings: Readonly<Building[]>;
}

type ProductRecipeMap = { [prodid: number]: number };

@Module( { dynamic: true, store, name: 'app' } )
class AppState extends VuexModule implements IAppState {

  private static readonly TechsForBuilding: { [name: string]: string } = {
    CropFarm: '+2cropfields',
    LivestockFarm: 'deforestation',
    OrchardFarm: '+2orchardfields',
    PlantationFarm: '+2plantationfields',
  };

  private static readonly TechsForCats: { [name: string]: string } = {
    CoastalGatherers: '+2coastalharvesters',
    LandGatherers: '+2landharvesters',
    OffshoreGatherers: '+2offshoreharvesters',
  };

  public theme = 'dark';
  public module: string = 'RoI'; //

  public targets: Target[] = [{id: 1, amount: 2, days: 15, demand: 1.5}];
  public products: Readonly<ProductDefinition[]> = [];
  public recipes: Readonly<Recipe[]> = [];
  public buildings: Readonly<Building[]> = [];
  public locale: { [key: string]: string } = {};
  public productCategories: ProductCategory[] = [];
  public get productsWithOptions() { return this.products.filter((p) => p.recipes.length > 1); }
  public language = languages.some((l: any) => l.keycode.toLowerCase() === navigator.language.toLowerCase()) ? navigator.language : 'en-us';
  get productCategory() { return (prodId: number) =>
    this.productCategories.find(cat => cat.name === this.products[prodId].productCategory);
  }

  get languages() { return languages; }

  get localeKey() { return (key: string) => key.toLowerCase().replace(/ /g, ''); }

  get t() { return (key: string) => this.locale[key] ? this.locale[key].replace(/{.*?}/g, '') : undefined; }

  get tp() { return (obj: ProductDefinition) =>
    this.locale[`productdefinition.${this.localeKey(obj.name)}.productname`] || obj.displayName;
  }

  /// product category
  ///
  get tpc() { return (obj: string) =>
    this.locale[`datacategory.${this.localeKey(obj)}.categoryname`];
  }

  ///
  get tr() { return (r: Recipe) =>
    this.locale[`recipe.${this.localeKey(r.name)}.title`];
  }

  get tb() { return (b: Building) =>
    this.locale[`building.${this.localeKey(b.name)}.buildingname`];
  }

  get ttech() { return (tech: string) => this.t(`techtreegenericunlock.${this.localeKey(tech)}.unlockname`) || tech; }

  get buildingByName() { return (name: string): Building | undefined => this.buildings.find((b) => b.name === name); }

  //options
  public productOptions: ProductRecipeMap = {};
  public useSimpleRecipes = false;
  public technologies: { [t: string]: boolean } = {
    '+2coastalharvesters': true,
    '+2landharvesters': true,
    '+2offshoreharvesters': true,
    '+2cropfields': true,
    '+2orchardfields': true,
    '+2plantationfields': true,
    'deforestation': true,
    // 'factoryefficiencyl1': false, // 25%
    // 'factoryefficiencyl2': false, // 50%
    // 'factoryefficiencyl3_l5': false, // 75%
    // 'factoryefficiencyl6': false,
    // 'factoryefficiencyl7': false,
  }; // for +2 field, +2 harvester, etc.

  public get modulesCount() { return (building: Building) =>
    ( building.name in AppState.TechsForBuilding && this.technologies[AppState.TechsForBuilding[building.name]] ) ||
    ( building.category in AppState.TechsForCats && this.technologies[AppState.TechsForCats[building.category]] )
      ? 5 : 3;
  }
  // product id: target productivity
  // public result: { [key: number]: number } = {};

  // returns recipes for this product according to options
  public get productRecipe() { return (prodId: number): Recipe =>
    this.recipes[
      this.products[prodId].recipes.length > 1 ? this.productOptions[prodId] : this.products[prodId].recipes[0]
      ];
  }

  public get flow() { return (prodId: number, targetAmount: number | Fraction, targetDays: number) => {

    const flow: Result = {};
    const recipe = this.productRecipe(prodId);

    const recipeResult = recipe.result.find((r) => r.id === prodId)!;
    const recipeDays = this.useSimpleRecipes ? Math.max(15, Math.round( recipe.gameDays / 15 ) * 15) : recipe.gameDays;



    const numRecipes = (typeof targetAmount === 'number' ? new Fraction(targetAmount) : targetAmount)
      .mul(recipeDays).div(recipeResult.amount).div(targetDays);

    // how many recipes we need to
    /*console.table({
        'name': recipe.name,
        numRecipes,
        targetAmount,
        'recipe game days': recipe.gameDays,
        'recipe result amount': recipeResult.amount,
        targetDays
    });*/

    flow[recipe.id] = numRecipes;

    for ( const src of recipe.ingredients ) {
      const sourcesFlow = this.flow(src.id, numRecipes.mul(src.amount), recipeDays);
      for (const srcId in sourcesFlow) {
        flow[srcId] = (flow[srcId] || new Fraction(0)).add(sourcesFlow[srcId]);
      }
    }

    return flow;
  }; }

  public get result(): Result {

    // usual .map.reduce does not merge recipes with several results,
    // for example for target of 2 milk and 2 leather it would give 4 cow fields. But 2 is enough. So

    // return this.targets.map((t) => this.flow( t.id, t.amount, t.days )).reduce((result, f) => {
    //     for (const srcId in f) {
    //         result[srcId] = (result[srcId] || new Fraction(0)).add(f[srcId]);
    //     }
    //
    //     return result;
    // }, {});

    const targets =  [ ...this.targets ].map((o) => ({...o}));
    const result: Result = {};
    while ( targets.some(t => t.amount > 0 )) {
      const ti = targets.findIndex(t_ => t_.amount > 0 );
      let t = targets[ti];
      const r = this.flow(t.id, t.amount, t.days);
      // console.log('flow for', targets.map(tt=>`${tt.id} ${tt.amount} / ${tt.days}`), r);

      for (const srcId in r) {
        result[srcId] = (result[srcId] || new Fraction(0)).add(r[srcId]);

        this.recipes[srcId].result.forEach((recRes) => {
          const sti = targets.findIndex(t_ => t_.id === recRes.id);
          if (sti !== -1) {
            targets[sti].amount -=  result[srcId].mul(targets[sti].days).mul(recRes.amount).div(this.recipes[srcId].gameDays).valueOf();
          }
        });
      }
    }

    return result;
  }

  // economics
  // got formulas from game
  get upkeep() { return (hubUpkeep: number, moduleUpkeep: number) => hubUpkeep + (moduleUpkeep * 3); }

  // without category multiplier
  get productPrice() { return (productId: number, onlyValue: boolean = false): number => {
    const recipe = this.productRecipe(productId);
    const ingredientsValue = this.ingredientsValue(recipe);
    const totalOutput = recipe.result.reduce((total, res) => total + res.amount, 0);

    const result = recipe.result.find((r) => r.id === productId)!;
    const moduleUpkeep = recipe.requiredModules.length ?
      this.buildingByName(recipe.requiredModules[0].buildingName)!.moduleUpkeep || 0 : 0;

    const upkeep = this.upkeep(
      this.buildings[recipe.building].upkeep ? this.buildings[recipe.building].upkeep!.totalMonthlyUpkeep! : 0, moduleUpkeep
    );

    const priceFunction = new Function('ingredientsValue', 'upkeep', 'recipeDays', 'recipeOutput', 'productOutput',
      'return ' + this.products[productId].price);

    return priceFunction(ingredientsValue, upkeep, recipe.gameDays, totalOutput, result.amount) *
      (onlyValue ? 1 : (this.productCategory(productId)!.priceMultiplier || 1));
  }}

  get ingredientsValue() { return (recipe: Recipe) =>
    recipe.ingredients.reduce((sum, ingr) => sum + this.productPrice(ingr.id, true) * ingr.amount, 0);
  }
  // A C T I O N S

  @Action({rawError: true})
  public async loadAssets() {

    const prods = (await axios.get(`static/${this.module}/prods.json`)).data;
    const recipes = (await axios.get(`static/${this.module}/recipes.json`)).data;
    const prodCats = (await axios.get(`static/${this.module}/productCategories.json`)).data;
    const buildings = (await axios.get(`static/${this.module}/buildings.json`)).data;

    // normalize JSON
    const _recs: Recipe[] = [];
    const _prods: ProductDefinition[] = [];
    // const _cats: string[] = [];
    prodCats.sort((a: any, b: any) => a.uiOrder - b.uiOrder);

    buildings.forEach((b: any, bid: number) => {
      (b as any as Building).id = bid;
      (b as any as Building).availableRecipes =
        (b.availableRecipes as string[]).map((recName: string): number =>
          recipes.findIndex((r: any) => r.object.name === recName));
    });

    prods.map((o: any) => o.object).forEach((p: any, pid: number) => {

      if ( !p.productCategory ) {
        // try to get by tier
        const rec = recipes.find((r: any) => r.object.result.some((res: any) => res.productName === p.name));
        if ( rec ) {
          p.productCategory = 'Row' + rec.object.tier;
        }
      }

      // if ( !_prodCats.includes(p.productCategory)) {
      //     _prodCats.push(p.productCategory);
      // }

      // p.category = _cats.indexOf(p.category);
      //(p as any as ProductDefinition).productCategory = prodCats.findIndex((c) => c.name === p.productCategory);
      (p as any as ProductDefinition).recipes = [];
      (p as any as ProductDefinition).id = pid;

      _prods.push(p as any as ProductDefinition);
    });

    recipes.map((o: any) => o.object).forEach((r: any, rid: number) => {

      (r as any as Recipe).ingredients = r.ingredients.map((i: any) => Object.freeze({
        id: _prods.findIndex((p) => p.name === i.productName ),
        amount: i.amount,
      }));

      (r as any as Recipe).result = r.result.map((i: any) => Object.freeze({
        id: _prods.findIndex((p) => p.name === i.productName ),
        amount: i.amount,
      } ) );

      (r as any as Recipe).id = rid;

      (r as any as Recipe).result.forEach((res) => {
        _prods[res.id].recipes.push(rid);
      });

      (r as any as Recipe).building =
        buildings.findIndex((b: any) => (b as any as Building).availableRecipes.some((ar) => ar === rid));
      _recs.push(Object.freeze((r as any as Recipe)));
    });

    this.SET_PRODS(_prods);
    this.SET_RECIPES(_recs);
    // this.SET_CATS(_cats);
    this.SET_PRODCATS(prodCats);
    this.SET_BUILDINGS(buildings as any as Building[]);

    // default options
    const _opts: {[k: number]: number} = {};
    _prods.filter((p) => p.recipes.length > 1).forEach((p) => _opts[p.id] = p.recipes[0]);
    this.CLEAR_PRODUCTOPTIONS();
    for ( const pid in _opts ) {
      this.SET_PRODUCTOPTIONS([parseInt(pid), _opts[pid]]);
    }

  }

  @Action({commit: 'ADD_TARGET', rawError: true})
  public addTarget([prod, amount, days, demand]: [ProductDefinition, number, number, number]) {
    return { id: this.products.findIndex((p) => p.name === prod.name), amount, days, demand };
  }

  @Action({commit: 'REMOVE_TARGET', rawError: true})
  public removeTarget(id: number) {
    return id;
  }

  @Action({ commit: 'SET_TARGET', rawError: true})
  public setTarget([id, t]: [number, Target]) {
    return [id, {
      ...t,
      amount: Math.max(0, t.amount),
      days: Math.max(1, t.days),
      demand: Math.max( 0.01, t.demand),
    }];
  }

  @Action({commit: 'SET_PRODUCTOPTIONS'})
  public setProductOptions(args: [number, number]) { return args; }

  @Action({ rawError: true })
  public async setLocale(loc: string) {
    // lang-langdata_gamedata_it-it
    const obj: {[key: string]: string} = {};

    await Promise.all(['gamedata', 'scene', '2130'].map(async sec => {
      const path = `static/lang/lang-langdata_${sec}_${loc.toLowerCase()}.json`;
      const res = await axios.get(path);
      res.data.forEach((e: {key: string; value: string; } ) => obj[e.key] = e.value);
      return Promise.resolve();
    }));
    this.SET_LOCALE(obj);
    this.SET_LANG(loc);
  }

  @Action({ rawError: true })
  public async setModule(mod: 'RoI' | 'RoI 2130') {
    this.SET_MODULE(mod);
    return this.loadAssets();
  }

  @Action({commit: 'SET_TECH'})
  switchTech([tech, v]: [string, boolean]) { return [tech, v]; }

  @Action({commit: 'SET_THEME', rawError: true})
  setTheme(theme: string) {
    return theme;
  }

  @Action({commit: 'SET_SIMPLERECIPES'})
  updateSimpleRecipes(v: boolean) { return v; }

  // M U T A T I O N S

  @Mutation private SET_PRODS(v: ProductDefinition[]) { this.products = Object.freeze(v); }
  @Mutation private SET_RECIPES(v: Recipe[]) { this.recipes = Object.freeze(v); }
  @Mutation private SET_BUILDINGS(v: Building[]) { this.buildings = Object.freeze(v); }
  // @Mutation private SET_CATS(v: any) { this.categories = Object.freeze(v); }
  @Mutation private SET_PRODCATS(v: any) { this.productCategories = Object.freeze(v); }
  @Mutation private CLEAR_PRODUCTOPTIONS() { Vue.set(this, 'productOptions', {} ); }
  @Mutation private SET_PRODUCTOPTIONS([prodId, recipeId]: [number, number]) {
    Vue.set(this.productOptions, prodId, recipeId);
  }

  @Mutation
  private ADD_TARGET(t: Target) {
    const exists = this.targets.findIndex(e => e.id === t.id );
    if ( exists !== -1 ) {
      this.targets.splice(exists, 1, t);
    } else {
      this.targets.push(t);
    }
  }

  @Mutation
  private REMOVE_TARGET(i: number) {
    this.targets.splice(i, 1);
  }

  @Mutation private SET_TARGET([tid, t]: [number, Target]) { this.targets.splice(tid, 1, t); }

  @Mutation private SET_LOCALE(data: {[key: string]: string}) { this.locale = data; }
  @Mutation private SET_LANG(lang: string) { this.language = lang; }
  @Mutation private SET_TECH([tech, v]: [string, boolean]) { Vue.set(this.technologies, tech, v); }
  @Mutation private SET_THEME(v: string) { this.theme = v; }
  @Mutation private SET_SIMPLERECIPES(v: boolean) { this.useSimpleRecipes = v; }
  @Mutation private SET_MODULE(mod: string) { this.module = mod; }

}

export default getModule(AppState);
