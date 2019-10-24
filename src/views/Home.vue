<template>
  <transition mode="out-in" name="fade">
  <img v-if="loading" src="@/assets/loading.gif"/>
  <div v-if="!loading">
    <header class="sticky-top">
    <!--<b-dropdown size="lg" :text="targetProduct">-->
    <b-navbar>
      <b-nav-form class="flex-fill">

        <ProductForm size="lg" v-model="newTarget"></ProductForm>

        <b-button v-b-toggle.recipe-options  size="lg"  class="ml-1" variant="outline-primary">{{tt(LANG_SETTINGS)}}</b-button>
      </b-nav-form>
      <b-nav-form>
        <b-radio-group :options="['RoI', 'RoI 2130']" :checked="module" @input="changeModule"></b-radio-group>
        <b-radio-group :options="['light', 'dark']" buttons button-variant="outline-primary"
                       :checked="theme" @input="themeChanged"></b-radio-group>
        <b-form-select :value="language.toLowerCase()"
                       :options="languages.map((l) => ({text: l.displayName, value: l.keycode.toLowerCase()}))"
                       @input="changeLocale"
        >
        </b-form-select>
      </b-nav-form>
    </b-navbar>

    <b-collapse id="recipe-options" v-model="showOptions">
      <b-form-checkbox :checked="useSimpleRecipes" @input="updateSimpleRecipes($event)" switch size="lg"
                       :title="tt(LANG_SIMPLE_RECIPES_DESC)"
                       button-variant="primary">{{tt(LANG_SIMPLE_RECIPES)}}</b-form-checkbox>

      <b-form-group v-for="(recid, pid) in options" :label="tp(products[pid])" :key="pid">
        <b-form-radio-group buttons button-variant="outline-primary" :checked="recid" @input="setProductRecipe(pid, $event)">
          <b-form-radio v-for="rid in products[pid].recipes" :value="rid">{{tb(buildings[recipes[rid].building])}}</b-form-radio>
        </b-form-radio-group>
      </b-form-group>

      <b-form-checkbox v-for="(tech, id) in techs" :key="id" :checked="tech"
                       switch size="lg" button-variant="primary"
        @input="onTechSwitch(id, $event)"
      >{{ttech(id)}}</b-form-checkbox>
    </b-collapse>

    <b-collapse id="recipe-select" v-model="showSelect">
      <b-nav>
        <b-nav-item v-for="(c, i) in productCategories" :key="c.name" >
          <b-dropdown :text="tpc(c.name) || c.categoryName" variant="outline-primary" lazy :menu-class="[ productsOf(c.name).length > 10 ? 'columns' :'']">
            <b-dropdown-item v-for="(p, ip) in productsOf(c.name)" :key="p.name" @click="addTarget(p)" :title="tp(p)">{{tp(p)}}</b-dropdown-item>
          </b-dropdown>
        </b-nav-item>
      </b-nav>
    </b-collapse>

    <h3>{{tt(LANG_TARGETS)}}</h3>
    <b-list-group>
      <b-list-group-item v-for="(t, i) in targets">

          <ProductForm :key="i" :value="t" deletable="true" @input="updateTarget(i, $event)" @delete="removeTarget(i)"></ProductForm>

      </b-list-group-item>
    </b-list-group>
    </header>


    <h3>{{tt(LANG_BUDGET)}}</h3>
    <tree-table
          :data = "treeItems"
          :columns="[
            { title: tt(LANG_BUILDINGS), key:'name' },
            // { title: 'recipes', key: 'flow', width: '100px' },
            { title: tt(LANG_MARKETVALUE), key: 'flow' },
            { title: tt(LANG_BUILDINGCOST) + ', $', key: 'cost', type: 'template', template: 'cost' },
          ]"
          :is-fold="false"
          :selectable="false"
          :expand-type="false"
          :show-summary = "true"
          :summary-method="calcSummary"
          empty-text="no results"
          sum-text="Total"
    >
      <template slot="cost" scope="scope">
        {{displayCost(scope) | cost}}
      </template>
    </tree-table>


  </div>
  </transition>

</template>

<script lang="ts">
  import {Component, Mixins, Vue, Watch} from "vue-property-decorator";
    import appState, {Building, ProductDefinition, Result} from "@/store/app";
    import {BButton, BDropdown, BDropdownItem, BFormInput, BInputGroup, BNavForm} from "bootstrap-vue";
    import ProductResult from "@/components/ProductResult.vue";
    import Fraction from 'fraction.js/fraction';
    import {costsFilter, periodFilter} from "@/utils";
    import {TreeDataItem} from '@/../../tree-table-vue';
    import ProductForm from '@/components/ProductForm.vue';
    import Const from '@/mixins/Const.ts';

    @Component({
  components: {
    ProductResult, ProductForm,
    BButton, BNavForm, BInputGroup, BFormInput, BDropdown, BDropdownItem,
  },
})
export default class Home extends Mixins(Const) {

  get theme() { return appState.theme; }
  get module() { return appState.module; }
  get recipes() { return appState.recipes; }
  get products() { return appState.products; }
  get buildings() { return appState.buildings; }
  get options() { return appState.productOptions; }
  get productsOf() { return (cat: string) => appState.products.filter((p) => p.productCategory === cat); }
  get productCategories() { return appState.productCategories; }
  get targets() { return appState.targets; }
  get result() { return appState.result }
  get resultOf() { return (prodCat: string): Result => {
      return Object.keys(appState.result).map((k) => parseInt(k))
              .filter((ri: number) => appState.products[appState.recipes[ri].result[0].id].productCategory === prodCat)
              .reduce<Result>((obj: Result, key: number): Result => { obj[key] = appState.result[key]; return obj }, {})
    }
  }

  get techs() { return appState.technologies; }

  get language() { return appState.language; }
  get languages() { return appState.languages; }

  get productPrice() { return (prodId: number): number => Math.round(appState.productPrice(prodId)); }
  get totalProductPrices() {
// console.log(Object.keys(appState.result).map(id=> appState.recipes[id]));
    return appState.targets.reduce((total, target) => {
      return total + appState.productPrice(target.id) * target.demand * target.amount / target.days;
    }, 0);
  }

  get buildingsFlow() { return (recId: number ) => {
    appState.recipes[recId].result.map(res=> res.amount )
  }}

  get building() { return (recipeId: number): Building =>
      appState.recipes[recipeId].requiredModules.length ?
        appState.buildingByName(appState.recipes[recipeId].requiredModules[0].buildingName)! :
        appState.buildings[appState.recipes[recipeId].building]!;
  }

  get treeItems() {

    const res = [];

    for( const pcat of this.productCategories ) {
      const resultOf = this.resultOf(pcat.name);

      if ( Object.keys(resultOf).length > 0 ) {
        // categories
        const catId = res.push({
          name: this.tpc(pcat.name) || pcat.name,
          children: Object.keys(resultOf).map((k) => parseInt(k)).map((recipeId: number) => ({
            // recipes
                name: this.tr(this.recipes[recipeId]) || this.recipes[recipeId].displayName,
                flow: resultOf[recipeId].toFraction(true),
                children: this.resultRecipeBuildingsTree(recipeId, resultOf[recipeId])
          })),
        });
      }
    }

    return res;
  }

  get resultRecipeBuildingsTree() { return (recipeId: number, numRecipes: Fraction) => {

      const bld = appState.buildings[appState.recipes[recipeId].building];

      if ( !appState.recipes[recipeId].requiredModules.length ) { // simple buildings
          return Array.from(Array(numRecipes.ceil().valueOf()), () => ({
            name: this.tb(bld) || bld.displayName,
            cost: bld.baseCost,
          }));
      }

      // moduled building, like field in farms

      /// populate parent buildings  + modules
      const totalFlow = numRecipes.ceil().valueOf();
      const moduleBld = appState.buildingByName(appState.recipes[recipeId].requiredModules[0].buildingName)!;
      const modulesPerBuild = appState.modulesCount(bld);

      const numParent = Math.floor(totalFlow / modulesPerBuild);
      const remain = totalFlow - (numParent * modulesPerBuild);

      const res = Array.from(Array(numParent)).map(() => ({
        name: this.tb(bld) || bld.displayName,
        cost: bld.baseCost,

        children: [...Array(modulesPerBuild)].map(() => ({
          // full modules
          name: this.tb(moduleBld) || moduleBld.displayName,
          cost: moduleBld.baseCost,
        })),
      }));

      if ( remain > 0 ) {
        // remainder
        res.push({
          name: this.tb(bld) || bld.displayName,
          cost: bld.baseCost,
          children: Array.from(Array(remain)).map(() => ({
            name: this.tb(moduleBld) || moduleBld.displayName,
            cost: moduleBld.baseCost,
          })),
        });
      }

      return res;


  }}

  get tt() { return appState.t; }
  get tp() { return appState.tp; }
  get tpc() { return appState.tpc; }
  get tr() { return appState.tr; }
  get tb() { return appState.tb; }
  get ttech() { return appState.ttech; }

  get useSimpleRecipes() { return appState.useSimpleRecipes; }

  calcSummary(data: any, column: any, columnIndex: number) {
    if ( column.key === 'name') { return appState.t(this.LANG_TOTAL); }
    const total = data.reduce((t: number, row: any) => t + (parseInt(row['cost']) || 0), 0);
    if ( column.key === 'cost') { return costsFilter(total); }
    if ( column.key === 'flow') {
      return periodFilter(total / this.totalProductPrices);
    }

  }

      // get targetProduct() { return appState.target.id != -1 ? appState.products[appState.target.id] : undefined; }


  // get targetAmount() { return appState.target.amount }; // per 15 days?
  // set targetAmount(v) { appState.setTargetAmount(v); }
  //
  // get targetDays() { return appState.target.days; }
  // set targetDays(v) { appState.setTargetDays(v); }

  setProductRecipe(pid: number, recid: number) {
    appState.setProductOptions([pid, recid]);
    // appState.recalculate();
  }

  newTarget = { amount: 2, days: 15, demand: 1.5 };

  showSelect: boolean = false;
  showOptions: boolean = false;
  private loading = true;

  async created() {
    this.loading = true;
    await appState.setLocale(appState.language);
    await appState.loadAssets();
    this.loading = false;
  }

  displayCost(scope: any) {

    if ( scope.row._isFold && scope.row.children && scope.row.children.length > 0) { // collapsed
      return this.sumChildrenCosts(scope.row);
    }


    return scope.row.cost;
  }

  async changeLocale(locale: string) {
    this.loading = true;
    await appState.setLocale(locale);
    this.loading = false;
  }

  async changeModule(module: 'RoI' | 'RoI 2130') {
    this.loading = true;
    await appState.setModule(module);
    this.loading = false;

  }

  private sumChildrenCosts(item: TreeDataItem): number {
    return (parseInt(item.cost) || 0) + (item.children ? item.children
            .reduce((total: number, ch: TreeDataItem) => total + this.sumChildrenCosts(ch), 0) : 0);
  }

  async addTarget(prod: ProductDefinition) {
    await appState.addTarget([prod, this.newTarget.amount, this.newTarget.days, this.newTarget.demand]);
    // await appState.setTargetAmount(this.targetAmount); // per 15 days
    this.showSelect = false;
    // appState.recalculate();
  }

  removeTarget(i: number) {
    appState.removeTarget(i);
  }

  updateTarget(tid: number, value: any) {
    appState.setTarget([tid, value]);
  }

  onTechSwitch(tech: string, value: boolean) {
    appState.switchTech([tech, value]);
  }

  themeChanged(v: string) {
    appState.setTheme(v);
  }

  updateSimpleRecipes( v: boolean ) {
    appState.updateSimpleRecipes(v);
  }

}
</script>
<style lang="scss">
  .input-number { max-width: 4em;}
  table { font-size: 120%; }
  .columns {
    column-count: 3;
  }

  .fade-enter-active, .fade-leave-active {
    transition: opacity .25s;
  }
  .fade-enter, .fade-leave-to /* .fade-leave-active до версии 2.1.8 */ {
    opacity: 0;
  }
/*  .columns.dropdown-menu.show {
    display: flex;
    flex-wrap: wrap;
    width: 305px;
    padding: 20px 6px;
  }

  .columns .dropdown-item {
    padding: 0;
    width: 60px;
    height: 60px;
    overflow: hidden;
    border: 2px solid rgb(200, 124, 13);
    margin: 8px 6px;
  }*/

  /*.columns.show {*/
    /*display: flex;*/
    /*flex-flow: wrap column;*/
    /*max-height: 75vh;*/
    /*align-content: start;*/
    /*position: static;*/
    /*& li { flex: 1 }*/
  /*}*/
</style>
