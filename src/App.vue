<!--suppress CssInvalidAtRule -->
<style lang="sass">
  @import "styles/app"
</style>
<template>
  <div id="app">
    <router-view />
  </div>
</template>
<script lang="ts">
  import {Component, Vue, Watch} from "vue-property-decorator";
  import appState from "@/store/app";

  @Component
  export default class App extends Vue {
    get theme() { return appState.theme; }
    @Watch('theme')
    updateTheme() {
      document.documentElement.className = "theme-" + appState.theme;
    }
    created() {
      this.updateTheme();
    }
  }
</script>
