<template>

  <div>
    <!--<b-dropdown size="lg" :text="targetProduct">-->
    <b-navbar>
      <b-nav-form class="flex-fill">
        <b-button size="lg" variant="primary" v-b-toggle.recipe-select>+</b-button>
        <b-input-group size="lg" class="ml-1" :prepend="tt(LANG_AMOUNT)">
          <b-form-input class="input-number" placeholder="amount" v-model.number="targetAmount" type="number"></b-form-input>
        </b-input-group>
        <b-input-group size="lg" class="ml-1" prepend="per">
          <b-form-input ref="input-days-new" class="input-number" placeholder="days" v-model.number="targetDays" type="number"></b-form-input>
          <template #append>
            <b-dropdown text="" variant="outline-primary">
              <b-dropdown-item v-for="d in [10, 15, 20, 30, 60, 120]" @click="targetDays=d">{{d}}</b-dropdown-item>
            </b-dropdown>
            <b-input-group-append><b-input-group-text>{{tt(LANG_DAYS)}}</b-input-group-text></b-input-group-append>
          </template>
        </b-input-group>

        <b-button v-b-toggle.recipe-options  size="lg"  class="ml-1" variant="outline-primary">o</b-button>
      </b-nav-form>
      <b-nav-form>
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
          <b-dropdown :text="tpc(c.name) || c.categoryName" variant="outline-primary" lazy menu-class="columns">
            <b-dropdown-item v-for="(p, ip) in productsOf(c.name)" :key="p.name" @click="setTarget(p)">{{tp(p)}}</b-dropdown-item>
          </b-dropdown>
        </b-nav-item>
      </b-nav>
    </b-collapse>

    <h3>{{tt(LANG_TARGETS)}}</h3>
    <b-list-group>
      <b-list-group-item v-for="(t, i) in targets">
        <b-button-group class="d-flex">
          <b-button class="flex-fill w-100">{{tp(products[t.id])}}</b-button>

          <b-input-group :prepend="tt(LANG_AMOUNT)" class="ml-1">
            <b-form-input type="number" class="input-number" :value="t.amount"
                          @input="changeTargetAmount(i, $event)"></b-form-input>
          </b-input-group>

          <b-input-group prepend="per" :append="tt(LANG_DAYS)" class="ml-1">
            <b-form-input type="number" class="input-number" :value="t.days" @input="changeTargetDays(i, $event)"></b-form-input>
          </b-input-group>

          <b-input-group append="%" class="ml-1">
            <b-form-input type="number" :value="t.demand * 100" min="0" class="input-number"
                          placeholder="demand"
                          @input="changeTargetDemand(i, $event)"></b-form-input>
          </b-input-group>


          <b-input-group :prepend="tt(LANG_SALEPRICE)" append="$">
            <b-form-input readonly :value="productPrice(t.id) * t.demand | cost"></b-form-input>
          </b-input-group>

          <b-button-close variant="danger" size="lg" @click="removeTarget(i)"></b-button-close>
        </b-button-group>
      </b-list-group-item>
    </b-list-group>


    <!--<option v-for="(p, i) in products" :key="i">{{p.name}}</option>-->
    <!--</b-dropdown>-->
    <!--select>
      <option v-for="(r, i) in recipes" :key="i">{{r.name}}</option>
    </select>


    <h3>categories</h3>
    {{categories}}

    <h3>products</h3>
    <ul>
      <li v-for="p in products">{{p}}</li>
    </ul-->
    <h1>result</h1>
    <tree-table
          :data = "treeItems"
          :columns="[
            { title: tt(LANG_BUILDINGS), key:'name' },
            // { title: 'recipes', key: 'flow', width: '100px' },
            { title: tt(LANG_MARKETVALUE), key: 'flow' },
            { title: tt(LANG_BUILDINGCOST) + ', $', key: 'cost', type: 'template', template: 'cost' },
          ]"
          :is-fold="true"
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
    <!--ul>
      <li v-for="(c, ci) in productCategories" v-if="Object.keys(resultOf(c.name)).length > 0" :key="c.name">
        <h2>{{c.categoryName}}</h2>
        <ul>
          <li v-for="(v, k) in resultOf(c.name)" :key="k"><ProductResult :recipeId="k" :flow="v"></ProductResult> = 1</li>
        </ul>
      </li>

    </ul-->

    <!--h3>opts</h3>
    {{options}}-->
</div>


</template>

<script lang="ts">
    import {Component, Vue, Watch} from "vue-property-decorator";
    import appState, {Building, ProductDefinition, Result} from "@/store/app";
    import {BButton, BDropdown, BDropdownItem, BFormInput, BInputGroup, BNavForm} from "bootstrap-vue";
    import ProductResult from "@/components/ProductResult.vue";
    import Fraction from 'fraction.js/fraction';
    import {costsFilter, periodFilter} from "@/utils";
    import {TreeDataItem} from '@/../../tree-table-vue';

    @Component({
  components: {
    ProductResult,
    BButton, BNavForm, BInputGroup, BFormInput, BDropdown, BDropdownItem,
  },
})
export default class Home extends Vue {
  readonly LANG_TOTAL = 'ui.fullscreenpanels.buildingproductionoverview.productinfo.viewport.content.productinfo.infoarea.columntitles.lastyearconsumption';
  readonly LANG_SALEPRICE = 'datacategory.worldeventeffectproductprice.categoryname';
  readonly LANG_DAYS = 'ui.windows._static_recipebookpanel.recipepanelarea.recipediagramarea.recipeproductiontimearea.producetimeamount';
  readonly LANG_TARGETS = 'totalsalesviewmodel.budgetpanel.productcollectionname';
  readonly LANG_BUILDINGS = 'ui.fullscreenpanels.budgetpanel.sidebar.scrollviewfilterarea.viewport.content.buildings.title.active.filtertext';
  readonly LANG_BUILDINGCOST = 'datacategory.worldeventeffectbuildingcost.categoryname';
  readonly LANG_MARKETVALUE = 'ui.fullscreenpanels.buildingproductionoverview.productinfo.viewport.content.productinfo.infoarea.columntitles.marketvalue';
  // readonly LANG_DAYS = 'ui.windows._static_recipebookpanel.panel.recipepanelarea.recipediagramarea.recipeproductiontimearea.producetimeamount';
  readonly LANG_AMOUNT = 'tooltipcanvas.producttooltip.content.amountneeded';
  get theme() { return appState.theme; }
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
    return appState.targets.reduce((total, target) => {
      return total + appState.productPrice(target.id) * target.amount / target.days;
    }, 0);
  }

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

  targetAmount: number = 2;
  targetDays: number = 15;

  showSelect: boolean = false;
  showOptions: boolean = false;

  async created() {
    await appState.loadAssets();
    await appState.setLocale(appState.language);
  }

  mounted() {

    // appState.recalculate();
  }

  displayCost(scope: any) {

    if ( scope.row._isFold && scope.row.children && scope.row.children.length > 0) { // collapsed
      return this.sumChildrenCosts(scope.row);
    }


    return scope.row.cost;
  }

  changeLocale(locale: string) {
    appState.setLocale(locale);
  }

  private sumChildrenCosts(item: TreeDataItem): number {
    return (parseInt(item.cost) || 0) + (item.children ? item.children
            .reduce((total: number, ch: TreeDataItem) => total + this.sumChildrenCosts(ch), 0) : 0);
  }

  async setTarget(prod: ProductDefinition) {
    await appState.addTarget([prod, this.targetAmount, this.targetDays]);
    // await appState.setTargetAmount(this.targetAmount); // per 15 days
    this.showSelect = false;
    // appState.recalculate();
  }

  removeTarget(i: number) {
    appState.removeTarget(i);
  }

  changeTargetAmount(tid: number, amount: string) {
    appState.setTargetAmount([tid, parseInt(amount)]);
  }

  changeTargetDays(tid: number, amount: string) {
    appState.setTargetDays([tid, parseInt(amount)]);
  }

    changeTargetDemand(tid: number, d: string) {
      appState.setTargetDemand([tid, parseInt(d) / 100]);
    }

  onTechSwitch(tech: string, value: boolean) {
    appState.switchTech([tech, value]);
  }

  themeChanged(v: string) {
    appState.setTheme(v);
  }

}
</script>
<style lang="scss">
  .input-number { max-width: 4em;}
  table { font-size: 150%; }
  /*.columns.show {*/
    /*display: flex;*/
    /*flex-flow: wrap column;*/
    /*max-height: 75vh;*/
    /*align-content: start;*/
    /*position: static;*/
    /*& li { flex: 1 }*/
  /*}*/
</style>
