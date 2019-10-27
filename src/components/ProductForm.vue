<template>

  <b-button-group class="d-flex" v-if="value !== undefined">
    <b-button v-if="value.id !== undefined" :size="size" class="flex-fill w-100">{{tp(products[value.id])}}</b-button>
    <b-button v-else :size="size" variant="primary" v-b-toggle.recipe-select id="add-button">+</b-button>

    <b-input-group :size="size" class="ml-1" :prepend="tt(LANG_AMOUNT)">
      <b-form-input class="input-number" type="number" ref="amount" placeholder="amount"
                    :value="value.amount"
                    @input="updateTarget('amount', parseInt($event))"></b-form-input>
    </b-input-group>

    <b-input-group :size="size" class="ml-1" prepend="per">
      <b-form-input class="input-number" type="number" ref="days"  placeholder="days"
                    :value="value.days"
                    @input="updateTarget('days', parseInt($event))"></b-form-input>
      <template #append>
        <b-dropdown text="" variant="outline-primary">
          <b-dropdown-item v-for="d in [10, 15, 20, 30, 60, 120]" @click="updateTarget('days', d)">{{d}}</b-dropdown-item>
        </b-dropdown>
        <b-input-group-append><b-input-group-text>{{tt(LANG_DAYS)}}</b-input-group-text></b-input-group-append>
      </template>
    </b-input-group>

    <b-input-group :size="size" append="%" class="ml-1">
      <b-form-input class="input-number" type="number" ref="demand" min="0"
                    :value="value.demand * 100"
                    @input="updateTarget('demand', parseInt($event)/100)" ></b-form-input>
    </b-input-group>

    <b-input-group v-if="value.id !== undefined" :prepend="tt(LANG_SALEPRICE)" append="$">
      <b-form-input readonly :value="productPrice(value.id) * value.demand | cost"></b-form-input>
    </b-input-group>

    <b-button-close class="ml-1 text-monospace" v-if="deletable" variant="danger" size="lg" @click="$emit('delete')"></b-button-close>
  </b-button-group>
</template>

<script lang="ts">
  import {Component, Mixins, Prop, Vue, Watch} from "vue-property-decorator";
  import appState, {Target} from '@/store/app';
  import Const from '@/mixins/Const.ts';

  @Component
  export default class ProductForm extends Mixins(Const) {
    @Prop({ required: true }) value!: Target;
    @Prop({ default: false }) deletable!: boolean;
    @Prop({ default: 'md' }) size!: 'sm' | 'md' | 'lg';

    get tp() { return appState.tp; }
    get tt() { return appState.t; }
    get products() { return appState.products; }

    get productPrice() { return (prodId: number): number => Math.round(appState.productPrice(prodId)); }

    updateTarget(field: string, value: any) {
      this.$emit('input', {
          ...this.value, [field]: value,
      })
    }
  }
</script>

<style lang="scss">
  #add-button { font-size: 3.5rem; padding: 0 1rem;  line-height: 0.5; }
</style>
