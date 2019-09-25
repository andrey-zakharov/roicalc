<template>

  <div>
    <!--<b-dropdown size="lg" :text="targetProduct">-->
    <b-navbar>
      <b-nav-form>
        <b-button variant="outline-secondary" v-b-toggle.recipe-select>{{targetProduct ? targetProduct.name : ''}}</b-button>
        <b-input-group append="items">
          <b-form-input class="input-number mr-sm-2" placeholder="amount" v-model.number="targetAmount" type="number"></b-form-input>
        </b-input-group>
        <b-input-group prepend="per" append="days">
          <b-form-input class="input-number" placeholder="days" v-model.number="targetDays" type="number"></b-form-input>
        </b-input-group>

        <b-button v-b-toggle.recipe-options variant="outline-secondary">o</b-button>
      </b-nav-form>
    </b-navbar>

    <b-collapse id="recipe-options" v-model="showOptions">
      <b-form-group v-for="(recid, pid) in options" :label="products[pid].displayName" :key="pid">
        <b-form-radio-group buttons button-variant="outline-secondary" :checked="recid" @input="setProductRecipe(pid, $event)">
          <b-form-radio v-for="rid in products[pid].recipes" :value="rid">{{recipes[rid].name}}</b-form-radio>
        </b-form-radio-group>
      </b-form-group>
    </b-collapse>

    <b-collapse id="recipe-select" v-model="showSelect">
      <b-nav>
        <b-nav-item v-for="(c, i) in productCategories" :key="c.name" >
          <b-dropdown :text="c" variant="outline-secondary">
            <b-dropdown-item v-for="(p, ip) in productsOf(i)" :key="p.name" @click="setTarget(p)">{{p.name}}</b-dropdown-item>
          </b-dropdown>
        </b-nav-item>
      </b-nav>
    </b-collapse>
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
    <h3>result</h3>
    <ul>
      <li v-for="(v, k) in result" :key="k">{{products[k].name}}: {{v}}</li>
    </ul>
    <h3>productCategory</h3>
    {{productCategories}}

    <h3>opts</h3>
    {{options}}
</div>


</template>

<script lang="ts">
  import {Component, Vue, Watch} from "vue-property-decorator";
import appState from '@/store/app';
import {BButton} from 'bootstrap-vue';

@Component({
  components: {
    BButton,
  },
})
export default class Home extends Vue {
  get recipes() { return appState.recipes; }
  get products() { return appState.products; }
  get options() { return appState.productOptions; }
  get categories() { return appState.categories; }
  get productsOf() { return (cat) => appState.products.filter((p) => p.productCategory === cat); }
  get productCategories() { return appState.productCategories; }
  get result() { return appState.result; }

  get targetProduct() { return appState.target.id != -1 ? appState.products[appState.target.id] : undefined; }


  get targetAmount() { return appState.target.amount }; // per 15 days?
  set targetAmount(v) { appState.setTargetAmount(v); }

  get targetDays() { return appState.target.days; }
  set targetDays(v) { appState.setTargetDays(v); }

  setProductRecipe(pid, recid) {
    appState.setProductOptions([pid, recid]);
    // appState.recalculate();
  }

  showSelect: boolean = false;
  showOptions: boolean = false;

  async created() {
    await appState.loadAssets();
  }

  mounted() {

    // appState.recalculate();
  }

  async setTarget(prod) {
    await appState.setTarget(prod);
    // await appState.setTargetAmount(this.targetAmount); // per 15 days
    this.showSelect = false;
    // appState.recalculate();
  }
}
</script>
<style lang="scss">
  .input-number { max-width: 4em;}
</style>
