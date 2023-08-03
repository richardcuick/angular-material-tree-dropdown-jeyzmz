import { SelectionModel } from '@angular/cdk/collections';
import { FlatTreeControl } from '@angular/cdk/tree';
import {
  AfterViewInit,
  Component,
  ElementRef,
  Injectable,
  OnChange,
  OnInit,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import {
  MatTreeFlatDataSource,
  MatTreeFlattener,
} from '@angular/material/tree';
import { BehaviorSubject } from 'rxjs';
import { FormControl } from '@angular/forms';
import { Observable } from 'rxjs';
import { map, startWith } from 'rxjs/operators';
import { MatAutocomplete } from '@angular/material/autocomplete';

/**
 * Node for to-do item
 */
export class FoodNode {
  children?: FoodNode[];
  item: string;
}

/** Flat to-do item node with expandable and level information */
export class FoodFlatNode {
  item: string;
  level: number;
  expandable: boolean;
}

/**
 * The Json object for to-do list data.
 */
const TREE_DATA: FoodNode[] = [
  {
    item: '大庆油田',
    children: [
      {
        item: '大庆油田一区块',
        children: [{ item: '一井' }, { item: '二井' }, { item: '三井' }],
      },
      {
        item: '大庆油田二区块',
        children: [{ item: '四井' }, { item: '五井' }, { item: '六井' }],
      },
      {
        item: '大庆油田四区块',
        children: [{ item: '七井' }, { item: '八井' }, { item: '九井' }],
      },
      {
        item: '大庆油田五区块',
        children: [{ item: '十井' }, { item: '十一井' }, { item: '十二井' }],
      },
      {
        item: '大庆油田十区块',
        children: [{ item: '十三井' }, { item: '十四井' }, { item: '十五井' }],
      },
    ],
  },
  {
    item: '塔里木油田',
  },
];

/**
 * Checklist database, it can build a tree structured Json object.
 * Each node in Json object represents a to-do item or a category.
 * If a node is a category, it has children items and new items can be added under the category.
 */
@Injectable({ providedIn: 'root' })
export class ChecklistDatabase {
  dataChange = new BehaviorSubject<FoodNode[]>([]);
  treeData: any[];

  get data(): FoodNode[] {
    return this.dataChange.value;
  }

  constructor() {
    this.initialize();
  }

  initialize() {
    this.treeData = TREE_DATA;
    // Build the tree nodes from Json object. The result is a list of `TodoItemNode` with nested
    //     file node as children.
    const data = TREE_DATA;

    // Notify the change.
    this.dataChange.next(data);
  }

  public filter(filterText: string) {
    let filteredTreeData;
    if (filterText) {
      // Filter the tree
      function filter(array, text) {
        const getChildren = (result, object) => {
          if (object.item.toLowerCase() === text.toLowerCase()) {
            result.push(object);
            return result;
          }
          if (Array.isArray(object.children)) {
            const children = object.children.reduce(getChildren, []);
            if (children.length) result.push({ ...object, children });
          }
          return result;
        };

        return array.reduce(getChildren, []);
      }

      filteredTreeData = filter(this.treeData, filterText);
    } else {
      // Return the initial tree
      filteredTreeData = this.treeData;
    }

    // Build the tree nodes from Json object. The result is a list of `TodoItemNode` with nested
    // file node as children.
    const data = filteredTreeData;
    // Notify the change.
    this.dataChange.next(data);
  }
}

@Component({
  selector: 'my-app',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.css'],
  providers: [ChecklistDatabase],
})
export class AppComponent implements OnInit {
  /** Map from flat node to nested node. This helps us finding the nested node to be modified */
  flatNodeMap = new Map<FoodFlatNode, FoodNode>();

  /** Map from nested node to flattened node. This helps us to keep the same object for selection */
  nestedNodeMap = new Map<FoodNode, FoodFlatNode>();

  /** A selected parent node to be inserted */
  selectedParent: FoodFlatNode | null = null;

  /** The new item's name */
  newItemName = '';

  treeControl: FlatTreeControl<FoodFlatNode>;

  treeFlattener: MatTreeFlattener<FoodNode, FoodFlatNode>;

  dataSource: MatTreeFlatDataSource<FoodNode, FoodFlatNode>;

  @ViewChild('auto') autocomplete: MatAutocomplete;
  @ViewChild('autoTreeInput') autoInput: ElementRef;

  /** The selection for checklist */
  checklistSelection = new SelectionModel<FoodFlatNode>(true /* multiple */);

  /// Filtering
  myControl = new FormControl();
  options: string[] = ['One', 'Two', 'Three'];
  filteredOptions: Observable<string[]>;

  constructor(
    private _database: ChecklistDatabase,
    private myElement: ElementRef
  ) {
    this.treeFlattener = new MatTreeFlattener(
      this.transformer,
      this.getLevel,
      this.isExpandable,
      this.getChildren
    );
    this.treeControl = new FlatTreeControl<FoodFlatNode>(
      this.getLevel,
      this.isExpandable
    );
    this.dataSource = new MatTreeFlatDataSource(
      this.treeControl,
      this.treeFlattener
    );

    _database.dataChange.subscribe((data) => {
      this.dataSource.data = data;
    });
  }
  getLevel = (node: FoodFlatNode) => node.level;

  isExpandable = (node: FoodFlatNode) => node.expandable;

  getChildren = (node: FoodNode): FoodNode[] => node.children;

  hasChild = (_: number, _nodeData: FoodFlatNode) => _nodeData.expandable;

  hasNoContent = (_: number, _nodeData: FoodFlatNode) => _nodeData.item === '';

  expandAll = () => console.log('expandAll');

  /**
   * Transformer to convert nested node to flat node. Record the nodes in maps for later use.
   */
  transformer = (node: FoodNode, level: number) => {
    const existingNode = this.nestedNodeMap.get(node);
    const flatNode =
      existingNode && existingNode.item === node.item
        ? existingNode
        : new FoodFlatNode();
    flatNode.item = node.item;
    flatNode.level = level;
    flatNode.expandable = !!node.children;
    this.flatNodeMap.set(flatNode, node);
    this.nestedNodeMap.set(node, flatNode);
    return flatNode;
  };

  opened = () => {
    let inputWidth = this.autoInput.nativeElement.getBoundingClientRect().width;
    setTimeout(() => {
      let panel = (this.autocomplete.panelWidth as any).panel?.nativeElement;
      console.log('opened', panel, this.autocomplete);
      if (!panel) return;
      panel.style.minWidth = inputWidth + 'px';
    });
  };

  /** Whether all the descendants of the node are selected. */
  descendantsAllSelected(node: FoodFlatNode): boolean {
    const descendants = this.treeControl.getDescendants(node);
    const descAllSelected = descendants.every((child) =>
      this.checklistSelection.isSelected(child)
    );
    return descAllSelected;
  }

  /** Whether part of the descendants are selected */
  descendantsPartiallySelected(node: FoodFlatNode): boolean {
    const descendants = this.treeControl.getDescendants(node);
    const result = descendants.some((child) =>
      this.checklistSelection.isSelected(child)
    );
    return result && !this.descendantsAllSelected(node);
  }

  /** Toggle the to-do item selection. Select/deselect all the descendants node */
  todoItemSelectionToggle(node: FoodFlatNode): void {
    this.checklistSelection.toggle(node);
    const descendants = this.treeControl.getDescendants(node);
    this.checklistSelection.isSelected(node)
      ? this.checklistSelection.select(...descendants)
      : this.checklistSelection.deselect(...descendants);

    // Force update for the parent
    descendants.every((child) => this.checklistSelection.isSelected(child));
    this.checkAllParentsSelection(node);
  }

  /** Toggle a leaf to-do item selection. Check all the parents to see if they changed */
  todoLeafItemSelectionToggle(node: FoodFlatNode): void {
    this.checklistSelection.toggle(node);
    this.checkAllParentsSelection(node);
  }

  /* Checks all the parents when a leaf node is selected/unselected */
  checkAllParentsSelection(node: FoodFlatNode): void {
    let parent: FoodFlatNode | null = this.getParentNode(node);
    while (parent) {
      this.checkRootNodeSelection(parent);
      parent = this.getParentNode(parent);
    }
  }

  /** Check root node checked state and change it accordingly */
  checkRootNodeSelection(node: FoodFlatNode): void {
    const nodeSelected = this.checklistSelection.isSelected(node);
    const descendants = this.treeControl.getDescendants(node);
    const descAllSelected = descendants.every((child) =>
      this.checklistSelection.isSelected(child)
    );
    if (nodeSelected && !descAllSelected) {
      this.checklistSelection.deselect(node);
    } else if (!nodeSelected && descAllSelected) {
      this.checklistSelection.select(node);
    }
  }

  /* Get the parent node of a node */
  getParentNode(node: FoodFlatNode): FoodFlatNode | null {
    console.log(this.checklistSelection.selected);
    const currentLevel = this.getLevel(node);

    if (currentLevel < 1) {
      return null;
    }

    const startIndex = this.treeControl.dataNodes.indexOf(node) - 1;

    for (let i = startIndex; i >= 0; i--) {
      const currentNode = this.treeControl.dataNodes[i];

      if (this.getLevel(currentNode) < currentLevel) {
        return currentNode;
      }
    }
    return null;
  }

  getSelectedItems(): string {
    if (!this.checklistSelection.selected.length) return '选择钻井';
    return this.checklistSelection.selected.map((s) => s.item).join(',');
  }

  filterChanged(filterText: string) {
    console.log('filterChanged', filterText);
    // ChecklistDatabase.filter method which actually filters the tree and gives back a tree structure
    this._database.filter(filterText);
    if (filterText) {
      this.treeControl.expandAll();
    } else {
      this.treeControl.collapseAll();
    }
  }
}
