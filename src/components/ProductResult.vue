<template>
    <span>{{recipes[recipeId].name}}: {{flow.toFraction(true)}} of <span>{{building.displayName}}</span>

        <div class="d-flex">
            <span class="building-count align-self-center mr-2">{{flow.toFraction(true)}} x </span>

            <div class="building d-flex justify-content-center" v-for="i in int" :key="i"
                 :class="{ 'has-image': building.constructionBarIcon }"
                 :style="{ backgroundImage }">
                <span class="align-self-center">{{building.displayName}}</span>
            </div>
            <div class="building frac-building position-relative d-flex justify-content-center" v-if="frac"
                 :class="{ 'has-image': building.constructionBarIcon }"
                 :style="{ backgroundImage }">
                <span class="align-self-center">{{building.displayName}}</span>
                <div class="frac-building-mask" :style="{ 'width': (1-frac) * 100 + '%' }"></div>
            </div>
        </div>
    </span>


</template>

<script lang="ts">
    import {Component, Prop, Vue, Watch} from "vue-property-decorator";
    import Fraction from 'fraction.js/fraction';
    import appState, {Building} from "@/store/app";

    @Component
    export default class ProductResult extends Vue {
        private farmsCount = 3; // TBD technologies
        private harvesterCount = 3;
        @Prop({required: true}) recipeId!: number;
        @Prop({required: true}) flow!: Fraction;

        get int() { return this.flow.floor().n; }
        get frac() { return this.flow.sub(this.int).valueOf() }

        get building(): Building | undefined { return this.recipe.requiredModules.length ?
            appState.buildingByName(this.recipe.requiredModules[0].buildingName) :
            appState.buildings[appState.recipes[this.recipeId].building];
        }

        get buildingImage() { return (bld: Building): string => '/static/buildings/' + bld.constructionBarIcon.replace(/-/g, '_') + '.png'; }
        get backgroundImage() {
            return this.building!.constructionBarIcon ?
                `url( ${this.buildingImage(this.building!)} )` :
                'none';
        }
        get recipe() { return appState.recipes[this.recipeId]; }

        get recipes() { return appState.recipes; }
        get products() { return appState.products; }
        get buildings() { return appState.buildings; }


    }
</script>

<style lang="scss">
    @import '../vars.scss';
    $bw: 100px;
    $bh: 100px;
    .building {
        /*border: 2px solid $secondary;*/
        min-width: $bw;
        min-height: $bh;
        box-sizing: border-box;
        background: no-repeat center;
        background-size: cover;
        & span { transform: rotate(45deg);
            color: var(--light);
            text-shadow:
            1px 1px 1px var(--text-muted),
            1px -1px var(--text-muted),
            -1px -1px var(--text-muted),
            -1px 1px var(--text-muted)
        ;
        }
    }

    .frac-building-mask { position: absolute; right: 0; top: 0; bottom: 100%; min-height: 100%;
        background: var(--body-bg);
        opacity: 0.8;
    }

    .building-count {
        font-size: 200%;
    }

</style>
