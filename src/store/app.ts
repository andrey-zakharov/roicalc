import {Action, getModule, Module, Mutation, VuexModule} from 'vuex-module-decorators';
import store from './index';
import prods from '@/assets/prods.json';
import recipes from '@/assets/recipes.json';
import {Vue} from 'vue-property-decorator';

export interface ProductDefinition {
    name: string;
    displayName: string;
    category: number; // id
    productCategory: number; // id
    endGameProduct: boolean;
    disableContracts: boolean;
    svgIcon: string;
    tags: string[];
    recipes: number[];
}

export interface Product {
    id: number;
    amount: number;
}

export interface Recipe {
    name: string;
    displayName: string;
    description: string;
    gameDays: number;
    excludeInRecipeGraph: boolean;
    waterResources: boolean;
    requiredModules: string[];
    ingredients: Product[];
    result: Product[];
    tier: number;
    svgIcon: string;
}

export interface IAppState {
    target: Product; // target
    products: ProductDefinition[];
    recipes: Recipe[];
}

type ProductRecipeMap = { [prodid: number]: number };

@Module( { dynamic: true, store, name: 'app' } )
class AppState extends VuexModule implements IAppState {

    static readonly PRODS_ASSET = 'assets/prods.json';
    static readonly RECIPES_ASSET = 'assets/recipes.json';

    public target = { id: 1, amount: 2, days: 15 };
    public productOptions: ProductRecipeMap = {};
    public products: ProductDefinition[] = [];
    public categories = [];
    public productCategories = [];
    public recipes: Recipe[] = [];
    public get productsWithOptions() { return this.products.filter((p) => p.recipes.length > 1); }

    // product id: target productivity
    // public result: { [key: number]: number } = {};

    public get flow() { return (prodId: number, targetAmount: number, targetDays: number) => {

        const flow: { [key: number]: number } = {};
        const recipe = this.recipes[
            this.products[prodId].recipes.length > 1 ? this.productOptions[prodId] : this.products[prodId].recipes[0]
        ];

        const recipeResult = recipe.result.find((r) => r.id === prodId)!;

        // how many recipes we need to
        const numRecipes = targetAmount * recipe.gameDays / recipeResult.amount / targetDays;

        flow[prodId] = numRecipes;

        for ( const src of recipe.ingredients ) {
            const sourcesFlow = this.flow(src.id, src.amount * numRecipes, recipe.gameDays);
            for (const srcId in sourcesFlow) {
                flow[srcId] = (flow[srcId] || 0) + sourcesFlow[srcId];
            }
        }

        return flow;
    }; }

    public get result() {
        return this.flow( this.target.id, this.target.amount, this.target.days );
    }

    // A C T I O N S

    @Action({rawError: true})
    public async loadAssets() {

        // normalize JSON
        const _recs = [];
        const _prods = [];
        const _cats: string[] = [];
        const _prodCats: string[] = [];

        prods.map((o) => o.object).forEach((p, pid) => {

            if ( !_cats.includes(p.category)) {
                _cats.push(p.category);
            }

            if ( !p.productCategory ) {
                // try to get by tier
                const rec = recipes.find((r) => r.object.result.some((res) => res.productName === p.name));
                if ( rec ) {
                    p.productCategory = 'Tier' + rec.object.tier;
                }
            }

            if ( !_prodCats.includes(p.productCategory)) {
                _prodCats.push(p.productCategory);
            }

            p.category = _cats.indexOf(p.category);
            p.productCategory = _prodCats.indexOf(p.productCategory);
            p.recipes = [];
            p.id = pid;

            _prods.push(p);
        });

        recipes.map((o) => o.object).forEach((r, rid) => {

            r.ingredients = r.ingredients.map((i) => Object.freeze({
                id: _prods.findIndex((p) => p.name === i.productName ),
                amount: i.amount,
            }));

            r.result = r.result.map((i) => Object.freeze({
                id: _prods.findIndex((p) => p.name === i.productName ),
                amount: i.amount,
            } ) );

            r.id = rid;

            r.result.forEach((res) => {
                _prods[res.id].recipes.push(rid);
            });
            _recs.push(Object.freeze(r));
        });

        this.SET_PRODS(_prods);
        this.SET_RECIPES(_recs);
        this.SET_CATS(_cats);
        this.SET_PRODCATS(_prodCats);

        // default options
        const _opts: {[k: number]: number} = {};
        this.productsWithOptions.forEach((p) => _opts[p.id] = p.recipes[0]);
        console.log(_opts);
        for ( const pid in _opts ) {
            this.SET_PRODUCTOPTIONS([pid, _opts[pid]]);
        }

    }

    @Action({commit: 'SET_TARGET_PRODUCT', rawError: true})
    public setTarget(prod: ProductDefinition) {
        return prod;
    }

    @Action({ commit: 'SET_TARGET_AMOUNT', rawError: true})
    public setTargetAmount(am: number) {
        return am > 0 ? am : 0;
    }

    @Action({ commit: 'SET_TARGET_DAYS', rawError: true})
    public setTargetDays(am: number) {
        return am > 0 ? am : 0;
    }

    @Action({commit: 'SET_PRODUCTOPTIONS'})
    public setProductOptions(args: [number, number]) { return args; }
    // M U T A T I O N S

    @Mutation private SET_PRODS(v) { this.products = Object.freeze(v); }
    @Mutation private SET_RECIPES(v) { this.recipes = Object.freeze(v); }
    @Mutation private SET_CATS(v: any) { this.categories = Object.freeze(v); }
    @Mutation private SET_PRODCATS(v: any) { this.productCategories = Object.freeze(v); }
    @Mutation private SET_PRODUCTOPTIONS([prodId, recipeId]: [number, number]) {
        Vue.set(this.productOptions, prodId, recipeId);
    }

    @Mutation
    private SET_TARGET_PRODUCT(prod: ProductDefinition) {
        this.target.id = this.products.findIndex((p) => p.name === prod.name);
    }

    @Mutation private SET_TARGET_AMOUNT(n: number) { this.target.amount = n; }
    @Mutation private SET_TARGET_DAYS(n: number) { this.target.days = n; }

}

export default getModule(AppState);
