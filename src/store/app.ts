import {Action, getModule, Module, Mutation, VuexModule} from 'vuex-module-decorators';
import store from './index';
import prods from '@/assets/prods.json';
import recipes from '@/assets/recipes.json';
import prodCats from '@/assets/productCategories.json';
import buildings from '@/assets/buildings.json';
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
}

export interface Result {
    [key: number]: Fraction; // recipeId => flow
}

export interface IAppState {
    targets: Product[]; // target
    products: Readonly<ProductDefinition[]>;
    recipes: Readonly<Recipe[]>;
    buildings: Readonly<Building[]>;
}

type ProductRecipeMap = { [prodid: number]: number };

@Module( { dynamic: true, store, name: 'app' } )
class AppState extends VuexModule implements IAppState {

    public targets: Target[] = [{ id: 1, amount: 2, days: 15 }];
    public products: Readonly<ProductDefinition[]> = [];
    public recipes: Readonly<Recipe[]> = [];
    public buildings: Readonly<Building[]> = [];
    public locale: { [key: string]: string } = {};
    public productCategories = [];
    public get productsWithOptions() { return this.products.filter((p) => p.recipes.length > 1); }
    public language = navigator.language || navigator.userLanguage;
    get productCategory() { return (prodId: number) =>
        this.productCategories.find((cat) => cat.name === this.products[prodId].productCategory);
    }

    get languages() { return languages; }

    get localeKey() { return (key: string) => key.toLowerCase().replace(/ /g, ''); }

    get tp() { return (obj: ProductDefinition) =>
        this.locale[`productdefinition.${this.localeKey(obj.name)}.productname`] || obj.displayName;
    }

    /// product category
    ///
    get tpc() { return (obj: string) =>
        this.locale[`productcategory.${this.localeKey(obj)}.categoryname`];
    }

    ///
    get tr() { return (r: Recipe) =>
        this.locale[`recipe.${this.localeKey(r.name)}.title`];
    }

    get tb() { return (b: Building) =>
        this.locale[`building.${this.localeKey(b.name)}.buildingname`];
    }

    get buildingByName() { return (name: string): Building | undefined => this.buildings.find((b) => b.name === name); }

    //options
    public productOptions: ProductRecipeMap = {};
    public useSimpleRecipes = false;
    public technologies = []; // for +2 field, +2 harvester, etc.
    public get modulesCount() { return (buildingName: string) => 5; }
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

        // how many recipes we need to
        // console.log(targetAmount * recipe.gameDays / recipeResult.amount / targetDays, targetAmount, recipe.gameDays, recipeResult.amount, targetDays);
        const numRecipes = (typeof targetAmount === 'number' ? new Fraction(targetAmount) : targetAmount)
            .mul(recipe.gameDays).div(recipeResult.amount).div(targetDays);

        flow[recipe.id] = numRecipes;

        for ( const src of recipe.ingredients ) {
            const sourcesFlow = this.flow(src.id, numRecipes.mul(src.amount), recipe.gameDays);
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
        while ( targets.some((t) => t.amount > 0 )) {
            const ti = targets.findIndex((t) => t.amount > 0 );
            let t = targets[ti];
            const r = this.flow(t.id, t.amount, t.days);
            for (const srcId in r) {
                result[srcId] = (result[srcId] || new Fraction(0)).add(r[srcId]);
                this.recipes[srcId].result.forEach((recRes) => {
                    const sti = targets.findIndex((t) => t.id === recRes.id);
                    if (sti !== -1) {
                        targets[sti].amount -= result[srcId].valueOf();
                    }
                });
            }
        }

        return result;
    }

    // economics
    // got formulas from game
    get upkeep() { return (hubUpkeep: number, moduleUpkeep: number) => hubUpkeep + (moduleUpkeep * 3); }
    get productPrice() { return (productId: number): number => {
        const recipe = this.productRecipe(productId);
        const ingredientsValue = this.ingredientsValue(recipe);
        const totalOutput = recipe.result.reduce((total, res) => total + res.amount, 0);

        const result = recipe.result.find((r) => r.id === productId)!;
        const moduleUpkeep = recipe.requiredModules.length ?
            this.buildingByName(recipe.requiredModules[0].buildingName)!.moduleUpkeep || 0 : 0;

        const upkeep = this.upkeep(this.buildings[recipe.building].upkeep.totalMonthlyUpkeep || 0, moduleUpkeep);

        const priceFunction = new Function('ingredientsValue', 'upkeep', 'recipeDays', 'recipeOutput', 'productOutput',
            'return ' + this.products[productId].price);

        return priceFunction(ingredientsValue, upkeep, recipe.gameDays, totalOutput, result.amount) *
            this.productCategory(productId).priceMultiplier;
    }}

    get ingredientsValue() { return (recipe: Recipe) =>
        recipe.ingredients.reduce((sum, ingr) => sum + this.productPrice(ingr.id) * ingr.amount, 0);
    }
    // A C T I O N S

    @Action({rawError: true})
    public async loadAssets() {

        // normalize JSON
        const _recs: Recipe[] = [];
        const _prods: ProductDefinition[] = [];
        // const _cats: string[] = [];
        prodCats.sort((a, b) => a.uiOrder - b.uiOrder);

        buildings.forEach((b, bid) => {
            (b as any as Building).id = bid;
            (b as any as Building).availableRecipes =
                b.availableRecipes.map((recName: string): number => recipes.findIndex((r) => r.object.name === recName));
        });

        prods.map((o) => o.object).forEach((p, pid) => {

            if ( !p.productCategory ) {
                // try to get by tier
                const rec = recipes.find((r) => r.object.result.some((res) => res.productName === p.name));
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

        recipes.map((o) => o.object).forEach((r, rid) => {

            (r as any as Recipe).ingredients = r.ingredients.map((i) => Object.freeze({
                id: _prods.findIndex((p) => p.name === i.productName ),
                amount: i.amount,
            }));

            (r as any as Recipe).result = r.result.map((i) => Object.freeze({
                id: _prods.findIndex((p) => p.name === i.productName ),
                amount: i.amount,
            } ) );

            (r as any as Recipe).id = rid;

            (r as any as Recipe).result.forEach((res) => {
                _prods[res.id].recipes.push(rid);
            });

            (r as any as Recipe).building =
                buildings.findIndex((b) => (b as any as Building).availableRecipes.some((ar) => ar === rid));
            _recs.push(Object.freeze((r as any as Recipe)));
        });

        this.SET_PRODS(_prods);
        this.SET_RECIPES(_recs);
        // this.SET_CATS(_cats);
        this.SET_PRODCATS(prodCats);
        this.SET_BUILDINGS(buildings as any as Building[]);

        // default options
        const _opts: {[k: number]: number} = {};
        this.productsWithOptions.forEach((p) => _opts[p.id] = p.recipes[0]);
        // console.log(_opts);
        for ( const pid in _opts ) {
            this.SET_PRODUCTOPTIONS([parseInt(pid), _opts[pid]]);
        }

    }

    @Action({commit: 'ADD_TARGET', rawError: true})
    public addTarget([prod, amount, days]: [ProductDefinition, number, number]) {
        return { id: this.products.findIndex((p) => p.name === prod.name), amount, days };
    }

    @Action({commit: 'REMOVE_TARGET', rawError: true})
    public removeTarget(id: number) {
        return id;
    }

    @Action({ commit: 'SET_TARGET_AMOUNT', rawError: true})
    public setTargetAmount([id, am]: [number, number]) {
        return [id, am > 0 ? am : 0];
    }

    @Action({ commit: 'SET_TARGET_DAYS', rawError: true})
    public setTargetDays([id, am]: [number, number]) {
        return [id, am > 1 ? am : 1];
    }

    @Action({commit: 'SET_PRODUCTOPTIONS'})
    public setProductOptions(args: [number, number]) { return args; }

    @Action({ rawError: true })
    public async setLocale(loc: string) {
        //lang-langdata_gamedata_it-it
        const path = `/static/lang/lang-langdata_gamedata_${loc.toLowerCase()}.json`;

        const res = await axios.get(path);
        const obj: {[key: string]: string} = {};
        res.data.forEach((e) => obj[e.key] = e.value);
        this.SET_LOCALE(obj);
        this.SET_LANG(loc);
    }
    // M U T A T I O N S

    @Mutation private SET_PRODS(v: ProductDefinition[]) { this.products = Object.freeze(v); }
    @Mutation private SET_RECIPES(v: Recipe[]) { this.recipes = Object.freeze(v); }
    @Mutation private SET_BUILDINGS(v: Building[]) { this.buildings = Object.freeze(v); }
    // @Mutation private SET_CATS(v: any) { this.categories = Object.freeze(v); }
    @Mutation private SET_PRODCATS(v: any) { this.productCategories = Object.freeze(v); }
    @Mutation private SET_PRODUCTOPTIONS([prodId, recipeId]: [number, number]) {
        Vue.set(this.productOptions, prodId, recipeId);
    }

    @Mutation
    private ADD_TARGET(t: Target) {
        this.targets.push(t);
    }

    @Mutation
    private REMOVE_TARGET(i: number) {
        this.targets.splice(i, 1);
    }

    @Mutation private SET_TARGET_AMOUNT([tid, n]: [number, number]) { this.targets[tid].amount = n; }
    @Mutation private SET_TARGET_DAYS([tid, n]: [number, number]) { this.targets[tid].days = n; }

    @Mutation private SET_LOCALE(data) { this.locale = data; }
    @Mutation private SET_LANG(lang) { this.language = lang; }

}

export default getModule(AppState);
