import {PluginObject} from 'vue';

declare module 'tree-table-vue';

export interface TreeTableVueOptions {

}

export interface TreeTablePlugin extends PluginObject<TreeTableVueOptions> {

}

declare const TreeTable: TreeTablePlugin;
export default TreeTable;

export interface TreeDataItem {
    [key: string]: any;
    children?: TreeDataItem[];
}
