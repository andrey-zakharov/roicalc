import Vue from 'vue';
import App from './App.vue';
import router from './router';
import store from './store';
import BootstrapVue from 'bootstrap-vue';
import TreeTable from 'tree-table-vue';
import {costsFilter, periodFilter} from '@/utils';


Vue.use(TreeTable);
Vue.use(BootstrapVue);

Vue.config.productionTip = false;



Vue.filter('cost', costsFilter);
Vue.filter('period', periodFilter);


new Vue({
  router,
  store,
  render: (h) => h(App),
}).$mount('#app');

