/**
 * MIT License
 * 
 * Copyright (c) 2018 Dan From
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 * 
 * @author Dan From <dan.from@gmail.com>
 * @version 1.0.0
 */
var VanillaTree = (function () {
  "use strict";
  
  var editingNode = null; // The current element (<li>) that is being edited
  var _editingNode = null; // The current data node that is being edited
  
  var treeViewContainer = null; // The container which we will build the treeview in
  
  var originalNodes = null; // The original data nodes. Can be used if the user wants to reset the tree
  
  var nodeTree = null; // The nodetree we are working with. It is where changes will go
  
  var movingNode = null; // The element that is being moved. If null, no nodes a being moved. Resets to null after end move
  
  var elementBefore = null; // The element that will be shown inside a node element at the top, to show where the drop boundary is
  var elementAfter = null; // The element that will be shown inside a node element at the bottom, to show where the drop boundary is
  
  /**
   * This is the default option values.
   * The user is free to change any of them, when creating the initiating the TreeView.
   * 
   * @type Object
   */
  var baseOptions = {
    animationLength: .5, // The length of the animations. Must match the CSS speed
    animations: true, // Whether or not to use animations
    canDeselect: true, // Whether the user can deselect a node after it has been selected
    checkboxFirst: false, // Whether or not the checkboxes should be shown before the expand/collapse button. Only used if below is true
    checkboxes: false, // Whether or not to show checkboxes
    fadeOnRemove: true, // When removing a node, fade out before
    //icons: true, // Show icons // Not implemented at the moment. Can come later or being removed
    maxLevels: -1, // Max branches the tree can get. -1 is infinite
    moveable: true, // If the node element can be moved to another place
    rootDelete: false, // Whether or not the root can be deleted. If true and the node is deleted, there is no way of adding new elements. Unless one program it. There are actions for it
    selectMultiple: false, // Whether or not the user can select multiple nodes
    showControlsOnHover: true, // Show controls on hover or on select
    style: "" // Which style to use. Default, dark and more coming
  };
  
  var usedOptions = {}; // This is the options that mixing of baseOptions and user options will provide
  
  /**
   * A helper function, that combines two objects into a third, so neither
   * gets changed by reference.
   * 
   * @param {Object} obj1
   * @param {Object} obj2
   * @returns {Object}
   */
  var merge = Object.assign || function (obj1, obj2) {
    var obj3 = {};
    for (var attrname in obj1) {
      obj3[attrname] = obj1[attrname];
    }
    for (var attrname in obj2) {
      obj3[attrname] = obj2[attrname];
    }
    return obj3;
  };
  
  /**
   * This is the "class" that makes up the accessible TreeView
   * 
   * @param {String} action
   * @param {Array} nodes
   * @param {Object} options
   * @returns {undefined}
   */
  var TreeView = function (element, nodes, options) {
    
    // Set the usedOptions object, using the baseOptions as a base
    usedOptions = merge(baseOptions, options);
    
    // The list of original nodes. Can be used to reset/rebuild the entire tree
    originalNodes = JSON.parse(JSON.stringify(nodes)); // We are doing the cloning the JSON way, as Object.assign still references
    
    // The list of nodes that we are working with
    nodeTree = JSON.parse(JSON.stringify(nodes)); // We are doing the cloning the JSON way, as Object.assign still references
    
    // The element that will contain the treeview
    treeViewContainer = element;
    if (treeViewContainer.style.position === undefined) {
      treeViewContainer.style.positon = "relative"; // To make sure that the loading screen stays within the walls. We don't want no texicans to get in
    }
    
    // Check if the container is set
    if (treeViewContainer === "undefined" || treeViewContainer === null) {
      throw new Error("Treeview container not set");
    }
    
    rebuild({
      silent: false
    }); // Build it the first time
    
    // Only set the drag and drop events, if we can move them
    if (usedOptions.moveable) {
      // Setting the drag events for later use
      
      document.body.addEventListener("dragstart", dragStart);
      document.body.addEventListener("dragend", dragEnd);
      document.body.addEventListener('dragover', dragOver);
      document.body.addEventListener('dragenter', dragEnter);
      document.body.addEventListener('dragleave', dragLeave);
      document.body.addEventListener('drop', dragDrop);
    }
  
    // Setting the global click on the document body, so that we can remove a single event later, not an infinite number
    document.body.addEventListener("click", docClicked);
    // So that we can prevent children of a draggable being able to drag
    //.document.body.addEventListener("mousedown", docMousedDown);
    // So that we can start dragging again
    //document.body.addEventListener("mouseup", docMousedUp);

    if (usedOptions.showControlsOnHover) {
      // Another global, this time for mouseover
      document.body.addEventListener("mouseover", docMousedOver, false);

      // The final global and this is for mouseout
      document.body.addEventListener("mouseout", docMousedOut);
    }
    
    /**
     * Returns the function that becomes "tw"
     * 
     * @param {Mixed} action
     * @returns {Function}
     */
    return function (action) {
      
      var node = null;
      var addtNode = null;
      
      var aLen = arguments.length;
      var options;
      
      // var tv = new TreeView(document.querySelector("*ELEMENT*"));
      // tv.("*ACTION*");
      if (aLen === 1) {
        if ((typeof action) === "string") {
          // Do nothing, as everything is as it should be
        } else if ((typeof action) === "object") {
          // We are setting them both to the same value, as some of the methods needs a node and some needs an option object
          node = arguments[0];
          options = arguments[0];
        }
      }
      
      // var tv = new TreeView(document.querySelector("*ELEMENT*"));
      // tv.("*ACTION*", *OPTIONS*);
      if (aLen === 2) {
        options = arguments[1];
      }
      
      // var tv = new TreeView(document.querySelector("*ELEMENT*"));
      // tv.("*ACTION*", node, *OPTIONS*);
      if (aLen === 3) {
        node = arguments[1];
        options = arguments[2];
      }
      
      // var tv = new TreeView(document.querySelector("*ELEMENT*"));
      // tv.("*ACTION*", node, additional node, *OPTIONS*);
      if (aLen === 4) {
        node = arguments[1];
        addtNode = arguments[2];
        options = arguments[3];
      }
      
      /**
       * Delegates the node and/or options to the function with the matching action
       */
      switch (action) {
        case "getIndexesOfSelected":
          var options = merge({
            silent: false
          }, options);
          return getIndexesOfSelected(options);
          break;
          
        case "getBundle":
          return getNodeBundle(node);
          break;
          
        case "rebuild":
          var options = merge({
            silent: false
          }, options);
          return rebuild(options);
          break;
          
        case "expand":
          var options = merge({
            silent: false
          }, options);
          return expand(node, options);
          break;
          
        case "expandAll":
          var options = merge({
            silent: false
          }, options);
          return expandAll(options);
          break;
          
        case "collapse":
          var options = merge({
            silent: false
          }, options);
          return collapse(node, options);
          break;
          
        case "collapseAll":
          var options = merge({
            silent: false
          }, options);
          return collapseAll(options);
          break;
          
        case "getAllNodes":
          return getAllNodes();
          break;
          
        case "getAllElements":
          return getAllElements();
          break;
          
        case "addNode":
          var options = merge({
            silent: false
          }, options);
          addNode(node, options);
          break;
          
        case "addNodeBefore":
          var options = merge({
            silent: false
          }, options);
          addNodeBefore(node, addtNode, options);
          break;
          
        case "addNodeAfter":
          var options = merge({
            silent: false
          }, options);
          addNodeAfter(node, addtNode, options);
          break;
          
        case "remove":
          var options = merge({
            silent: false,
            fadeOnRemove: usedOptions.fadeOnRemove
          }, options);
          return remove(node, options);
          break;
          
        case "getExpanded":
          return getExpanded();
          break;
          
        case "getCollapsed":
          return getCollapsed();
          break;
          
        case "checkNode":
          var options = merge({
            silent: false
          }, options);
          return checkNode(node, options);
          break;
          
        case "checkAllNodes":
          var options = merge({
            silent: false
          }, options);
          return checkAllNodes(options);
          break;
          
        case "checkAllOpenedNodes":
          var options = merge({
            silent: false
          }, options);
          return checkAllOpenedNodes(options);
          break;
          
        case "checkAllOpenedNodes":
          var options = merge({
            silent: false
          }, options);
          return checkAllOpenedNodes(options);
          break;
      }
    }
  };
  /**
   * The different styles there is to choose from
   */
  TreeView.styles = {
    "default": "",
    "dark": "dark"
  };
  
  /**
   * A way of creating a list, that will be accepted as a NodeList
   * 
   * @type Function
   */
  var _NodeList = (function () {
    // make an empty node list to inherit from
    var nodelist = document.createDocumentFragment().childNodes;
    // return a function to create object formed as desired
    return function (nodes) {
      // Make sure were are dealing with an array like structure
      if (!(nodes instanceof Array) && !(nodes instanceof HTMLCollection)) {
        nodes = [nodes];
      }
      
      var i = 0;
      
      var _nodes = {}; // This is where we store the data
      // Loop over all nodes and make them compatible with the nodelist creation below
      nodes.forEach(function (node) {
        _nodes[i + ""] = {
          value: node,
          enumerable: true
        };
        i++;
      });
      
      // Set the length to the amount of nodes
      _nodes["length"] = {
        value: nodes.length
      };
      
      _nodes["item"] = {
        "value": function (i) {
          return this[+i || -1];
        }, 
        enumerable: true
      };
      
      // Return a newly created "NodeList"
      return Object.create(nodelist, _nodes);
    };
  }());
  
  /**
   * Rebuilds the indexes, so that it matches the new order
   * 
   * @param {HTMLElement} branch
   * @param {Object} branchNode
   * @param {String} id
   */
  function rebuildIndexes (branch, branchNode, id) {
    if (id === undefined) {
      id = "";
    }
    showLoading();
    
    /**
     * In order for the loading to actually start, then we have to do this
     */
    window.setTimeout(function () {
      if (!id) {
        id = "";
      }

      var nodes = branch.querySelectorAll(":scope > li.treeNode");
      var _nodes = branchNode.nodes;

      // Iterates over each found node
      nodes.forEach(function (node, i) {
        var nIndex = node.getAttribute("data-index");
        var branch2 = node.querySelector(":scope > ul.treeBranch");
        var newIndex = id + ( (id === "") ? "" : ".") + i;
        var _node = _nodes[i];
        //var _node = findMatchingTreeNode(nIndex, nodeTree);
        
        // If the original index and the new index are different form each other, then set it to the new one
        if (newIndex !== nIndex) {
          node.setAttribute("data-index", newIndex);
          _node.index = newIndex;
        }
        // Check to see if the data node already has a nodes object
        if (_node.nodes === undefined) {
          _node.nodes = [];
        } 

        // Find the child container
        var bul = node.querySelector(":scope > ul.treeBranch");
        if (bul !== null && bul.querySelectorAll(":scope > li.treeNode").length > 0) {
          // If there is children, then rebuild their indexes as well
          rebuildIndexes(bul, _node, newIndex);
        }
      });
      hideLoading();
    }, 0);
  }
  
  /**
   * Returns the indexes of the selected elements.
   * It will always return an array, no matter how many it is possible to
   * select.
   * 
   * @param {Object} options
   * @returns {Array}
   */
  function getIndexesOfSelected (options) {
    var selected = treeViewContainer.querySelectorAll("li.treeNode.selected");
    var indexes = [];
    selected.forEach(function (sel) {
      indexes[indexes.length] = sel.getAttribute("data-index");
    });
    
    return indexes;
  }
  
  /**
   * Rebuilds the entire tree again.
   * Can be exhausting if it is a big tree, so be careful with it.
   * 
   * @param {Object} options
   */
  function rebuild (options) {
    treeViewContainer.innerHTML = ""; // Empty it
    showLoading();
    window.setTimeout(function () {
      nodeTree = JSON.parse(JSON.stringify(originalNodes)); // We are doing the cloning the JSON way, as Object.assign still references

      for (var x in nodeTree) {
        _root = nodeTree[x];
        root = build([_root], 0, "");
        if (usedOptions.animations) {
          root.classList.add("animated");
        }
        treeViewContainer.appendChild(root);
      }
      if (!options.silent) {
        triggerEvent(treeViewContainer, treeViewContainer, "vtv.buildDone");
      }
      hideLoading();
    }, 0);
    var root = null;
    var _root = null;
    
  }
  
  /**
   * Shows the loading view, if it isn't already shown.
   */
  function showLoading () {
    if (treeViewContainer.querySelector("#treeViewLoading") !== null) {
      return; // It is already shown
    }
    var bg = document.createElement("div");
    bg.classList.add("treeview-loading-bg");
    bg.setAttribute("id", "treeViewLoading");
      
      var spanner = document.createElement("span");
      spanner.classList.add("spanner");
      
      var icon = document.createElement("i");
      icon.classList.add("fa");
      icon.classList.add("fa-fw");
      icon.classList.add("fa-5x");
      icon.classList.add("fa-spinner");
      icon.classList.add("fa-spin");
      
    bg.appendChild(spanner);
    bg.appendChild(icon);
    treeViewContainer.appendChild(bg);
  }
  
  /**
   * Hides the loading view, if it is shown
   */
  function hideLoading () {
    var treeViewLoading  = document.body.querySelector("#treeViewLoading");
    if (treeViewLoading !== null) {
      treeViewLoading.parentNode.removeChild(treeViewLoading);
    }
  }
  
  /**
   * Returns a new empty branch.
  
   * @returns {HTMLElement}
   */
  function getBranchTemplate () {
    var parent = document.createElement("ul"); // <ul class="treeBranch"></ul>
    parent.classList.add("treeBranch");
    
    return parent;
  }
  
  /**
   * Returns a new node template based on the arguments given.
  
   * @param {Mixed} node
   * @param {Integer} level
   * @param {String} ids
   * @returns {HTMLElement}
   */
  function getNodeTemplate (node, level, ids) {
    var treenode = document.createElement("li");
    treenode.classList.add("treeNode");
    treenode.setAttribute("draggable", true);
    
    var state = node.state || {};
    if (state.expanded) {
      treenode.classList.add("expanded");
    }
    if (state.selected) {
      treenode.classList.add("selected");
    }
    treenode.setAttribute("data-index", ids);
    
      var treeNodeItem = document.createElement("span");
      treeNodeItem.classList.add("treeNodeItem");

        var treeNodeExpandIcon = document.createElement("span");
        treeNodeExpandIcon.classList.add("treeNodeExpandIcon");

        var treeNodeIcon = document.createElement("span");
        treeNodeIcon.classList.add("treeNodeIcon");

        var treeNodeText = document.createElement("span");
        treeNodeText.classList.add("treeNodeText");
        treeNodeText.innerHTML = node.text;

      if (usedOptions.checkboxes && usedOptions.checkboxFirst) {
        var treeNodeCheck = document.createElement("input");
        treeNodeCheck.classList.add("treeNodeCheckbox");
        treeNodeCheck.setAttribute("type", "checkbox");
        treeNodeItem.appendChild(treeNodeCheck);
      }

      treeNodeItem.appendChild(treeNodeExpandIcon);
      treeNodeItem.appendChild(treeNodeIcon);
      treeNodeItem.appendChild(treeNodeText);

      if (usedOptions.checkboxes && !usedOptions.checkboxFirst) {
        var treeNodeCheck = document.createElement("input");
        treeNodeCheck.classList.add("treeNodeCheckbox");
        treeNodeCheck.setAttribute("type", "checkbox");
        treeNodeItem.appendChild(treeNodeCheck);
      }

      treenode.appendChild(treeNodeItem);
      
      var l = level+1;
      var children = build(node.nodes, l, ids);
      var iSpan = document.createElement("span");
      iSpan.classList.add("treenode-arrow");
      iSpan.innerHTML = "&#10516;";
      if (children !== null) {
        treenode.appendChild(children);
        treenode.classList.add("expandable");
      }
      
    treeNodeExpandIcon.appendChild(iSpan);
    
    return treenode;
  }
  
  /**
   * Builds the children of a node
  
   * @param {Array} nodes
   * @param {Integer} level
   * @param {String} ids
   * @returns {Element|Node}
   */
  function build (nodes, level, ids) {
    if (nodes === undefined || nodes.length === 0 || (level >= usedOptions.maxLevels && usedOptions.maxLevels > -1)) {
      return null;
    }
    var parent = getBranchTemplate();
        
    if (ids === "" && !parent.classList.contains("root")) {
      parent.classList.add("root");
      if (usedOptions.style !== "") {
        parent.classList.add(usedOptions.style);
      }
    }

    for (var n in nodes) {
      
      var ids2 = ids + (ids !== "" ? "." : "") + n;
      
      var node = nodes[n];
      var treenode = getNodeTemplate(node, level, ids2);
      node.index = ids2;
      
      parent.appendChild(treenode);
    }
    return parent;
  }
  
  /**
   * Called when the delete key has been clicked.
   * Calls a function that removes both the element and the data node
  
   * @param {Event} ev
   */
  function onDelete (ev) {
    var t = ev.target;
    remove(t.parentNode.parentNode, {
      silent: false,
      fadeOnRemove: usedOptions.fadeOnRemove
    });
  }
  
  /**
   * Called when the edit button has been clicked.
   * Opens a popup where one can change the text.
   * The element and the data node is both update
  
   * @param {Event} ev
   * @param {Object} config
   */
  function onEdit (ev, config) {
    var t = ev.target;
    editingNode = t.parentNode.parentNode; //  Li
    var index = editingNode.getAttribute("data-index");
    var popupTextButton = createChangePopup();
    var popup = popupTextButton[0];
    var text = popupTextButton[1];
    var button = popupTextButton[2];
    
    _editingNode = findMatchingTreeNode(index, nodeTree);
    
    text.value = _editingNode.text;
    
    editingNode.appendChild(popup);
  }
  
  /**
   * Called when the save button, in the update popup, has been clicked.
   * Calls a function that will change the element and the data node
   */
  function saveChanges () {
    var text = document.querySelector('#treeviewPopup input[type="text"]');
    //_editingNode.text = text.value;
    //editingNode.querySelector(":scope > .treeNodeItem > .treeNodeText").innerHTML = text.value;
    editingNode.querySelector("#treeviewPopup").classList.remove("show");
    changeNode(editingNode.querySelector(":scope > .treeNodeItem > .treeNodeText"), _editingNode, text.value, {
      silent: false
    });
  }
  
  /**
   * Called when the save button, in the add popup, has been clicked.
   * Calls a function that will add the element and the data node the their
   * respected trees.
   */
  function saveAdd () {
    var text = document.querySelector('#treeviewPopup input[type="text"]');
    editingNode.querySelector("#treeviewPopup").classList.remove("show");
    
    addNode(editingNode, {
      text: text.value,
      nodes: []
    }, {
      silent: false
    });
  }
  
  /**
   * Called when the add button has been clicked.
   * Shows a popup with a field to write the name of the new node.
   * 
   * @param {type} ev
   * @param {type} config
   */
  function onAdd (ev, config) {
    var t = ev.target;
    editingNode = t.parentNode.parentNode; //  Li
    var index = editingNode.getAttribute("data-index");
    var popupTextButton = createAddPopup();
    var popup = popupTextButton[0];
    var text = popupTextButton[1];
    var button = popupTextButton[2];
    
    _editingNode = findMatchingTreeNode(index, nodeTree);
    
    editingNode.appendChild(popup);
  }
  
  /**
   * Adds a new node at the end of the list
   * 
   * @param {HTMLElement} parent
   * @param {Object} _node
   * @param {Object} options
   */
  function addNode (parent, _node, options) {
    
    var pIndex = parent.getAttribute("data-index");
    var level = pIndex.split(".").length;
    
    var n = parent.querySelectorAll(":scope > ul > li").length;
    
    var index = pIndex + (pIndex !== "" ? "." : "") + n;
    
    var node = getNodeTemplate(_node, level, index); // node, level, ids
    
    var branch = parent.querySelector(":scope > ul.treeBranch");
    if (!branch) {
      branch = getBranchTemplate();
      parent.appendChild(branch);
    }
    
    branch.appendChild(node);
    
    if (!parent.classList.contains("expandable")) {
      parent.classList.add("expandable");
    }
    
    _node.index = index;
    
    var indexes = pIndex.split(".");
    var parent = null;
    var nodes = nodeTree;
    for (var i = 0; i < indexes.length; i++) {
      var x = indexes[i];
      if (parent === null) {
        parent = nodes[x]; // Root
        if (parent.index === index) {
          break;
        }
      } else {
        var x = indexes[i];
        var node2 = parent.nodes[x];
        if (node2.index === index) {
          break;
        }
        parent = node2;
      }
      
    }
    
    parent.nodes[parent.nodes.length] = _node;
    
    if (!options.silent) {
      triggerEvent(node, parent, "vtv.nodeAdded");
    }
  };
  
  /**
   * Adds a new node before another
   */
  function addNodeBefore (_node, before, options) {
    var index;
    // Check type of "before"
    if (typeof before === "string") { // Index?
      index = before;
      // Find the element, based on the index, updating "before"
      before = treeViewContainer.querySelector('[data-index="' + index + '"]');
    } else if (before.style !== undefined) {
      // "before" is already a element
    } else {
      index = before.index;
      // Convert data node to element
      before = treeViewContainer.querySelector('[data-index="' + index + '"]');
    }
    
    var _parent = getParentDataNode(index);
    
    // Set the parent of the "before" element
    var parent = before.parentNode;
    
    var pIndex = parent.getAttribute("data-index"); // Get the parents index
    var level = pIndex.split(".").length; // Find the level
    
    var n = parent.querySelectorAll(":scope > ul > li").length; // Find out which place we got
    
    index = pIndex + (pIndex !== "" ? "." : "") + n; // Ad the new id to the index
    
    node.index = index; // Set the index of the data node
    
    // Convert _node to node
    var node = getNodeTemplate(_node, level, index);
    
    // Insert node before "before"
    parent.insertBefore(node, before);
    
    //rebuildIndexes(treeViewContainer.querySelector(":scope > ul.treeBranch"), {nodes:nodeTree});
    rebuildIndexes(treeViewContainer.querySelector(":scope > ul.treeBranch"), _parent);
    
    if (!options.silent) {
      triggerEvent(node, parent, "vtv.nodeAddedBefore");
    }
  };
  
  /**
   * Adds a new node after another
   */
  function addNodeAfter (_node, after, options) {
    // Check type of "before"
    if (typeof after === "string") { // Index?
      index = after;
      // Find the element, based on the index, updating "after"
      after = treeViewContainer.querySelector('[data-index="' + index + '"]');
    } else if (before.style !== undefined) {
      // "after" is already a element
    } else {
      index = after.index;
      // Convert data node to element
      after = treeViewContainer.querySelector('[data-index="' + index + '"]');
    }
    
    var _parent = getParentDataNode(index);
    
    // Set the parent of the "before" element
    var parent = after.parentNode;
    
    var pIndex = parent.getAttribute("data-index"); // Get the parents index
    var level = pIndex.split(".").length; // Find the level
    
    var n = parent.querySelectorAll(":scope > ul > li").length; // Find out which place we got
    
    var index = pIndex + (pIndex !== "" ? "." : "") + n; // Ad the new id to the index
    
    _node.index = index; // Set the index of the data node
    
    // Convert _node to node
    var node = getNodeTemplate(_node, level, index);
    
    var p = after.parentNode;
    p.insertBefore(node, after.nextSibling);
    
    //rebuildIndexes(treeViewContainer.querySelector(":scope > ul.treeBranch"), {nodes:nodeTree});
    rebuildIndexes(p, _parent);
    
    if (!options.silent) {
      triggerEvent(close, _treeviewPopup, "vtv.nodeAddedAfter");
    }
  };
  
  /**
   * Removes the element and node.
   * It checks if the "node" is an object or element
   * 
   * @param {Mixed} obj
   * @param {Object} options
   * @returns {Array}
   */
  function remove (obj, options) {
    var bundle = getNodeBundle(obj);
    
    var index = bundle[0];
    var node = bundle[1];
    var _node = bundle[2];
    var parent = bundle[3];
    var _parent = getParentDataNode(index);
    
    if (options.fadeOnRemove) {
      node.classList.add("removing");
      setTimeout(function () {
        removeByElement(node, options); // could have choosen this instead: removeByNode(_node, {});
        rebuildIndexes(treeViewContainer.querySelector(":scope > ul.treeBranch"), {nodes:nodeTree});
        
        if (!options.silent) {
          triggerEvent(node, parent, "vtv.nodeRemoved"); // source, target, type
        }
      }, usedOptions.animationLength * 1000);
    } else {
      removeByElement(node, options); // could have choosen this instead: removeByNode(_node, {});
    }
    
    if (!options.fadeOnRemove) {
      rebuildIndexes(treeViewContainer.querySelector(":scope > ul.treeBranch"), {nodes:nodeTree});
      if (!options.silent) {
        triggerEvent(node, parent, "vtv.nodeRemoved"); // source, target, type
      }
    }
    
    return [node, _node];
  };
  
  /**
   * Removes the selected element node and the node
   * 
   * @param {Object} _node
   * @param {Object} options
   * @returns {HTMLElement}
   */
  function removeByNode (_node, options) {
    var index = _node.index;
    
    var node = treeViewContainer.querySelector('[data-index="' + index + '"]');
    node.parentNode.removeChild(node);
    removeFromTree(index, nodeTree);
    
    return node;
  };
  
  /**
   * Removes the given node and the element node
   * 
   * @param {HTMLElement} node
   * @param {Object} options
   * @returns {Object}
   */
  function removeByElement (element, options) {
    var index = element.getAttribute("data-index");
    
    element.parentNode.removeChild(element);
    
    var _node = findMatchingTreeNode(index, nodeTree);
    var removed = removeFromTree(index, nodeTree);
    
    return _node;
  };
  
  /**
   * Changed the selected node, triggering an event that contains the previouse
   * text and what it was changed to.
   * 
   * @param {HTMLElement} node
   * @param {Object} _node
   * @param {String} text
   * @param {Object} options
   */
  function changeNode (node, _node, text, options) {
    var from = _node.text;
    _node = text;
    node.innerHTML = text;
    if (!options.silent) {
      triggerEvent(node, node.parentNode.parentNode, "vtv.nodeChanged", {
        from: from,
        to: text
      });
    }
  };
  
  /**
   * Makes the state of the checkbox checked
   * But only if we are showing checkboxes.
   * 
   * @param {Mixed} obj
   * @param {Object} options
   */
  function checkNode (obj, options) {
    if (!usedOptions.checkboxes) {
      return;
    }
    
    var bundle = getNodeBundle(obj);
    
    var index = bundle[0];
    var node = bundle[1];
    var _node = bundle[2];
    var parent = bundle[3];
    
    var checkbox = node.querySelectorAll(':scope > .treeNodeItem > .treeNodeCheckbox > input[type="checkbox"]');
    checkbox.setAttribute("checked", true);
    
    // Change state of the data node, but only that
    changeState(_node, "checked", true, false);
    
    if (!options.silent) {
      triggerEventtriggerEvent(node, parent, "vtv.nodeChecked");
    }
  };
  
  /**
   * Changes the state of every node, so that they are checked
   * But only if we are showing checkboxes.
   * 
   * @param {type} options
   */
  function checkAllNodes (options) {
    if (!usedOptions.checkboxes) {
      return;
    }
    var checkboxes = treeViewContainer.querySelectorAll('input[type="checkbox"]');
    checkboxes.foreach(function (cb) {
      cb.checked = true;
    });
    
    // Change state of the data node recursivly
    changeState(treeNode, "checked", true, true);
    
    if (!options.silent) {
      triggerEvent(treeViewContainer.querySelector(".treeBranch.root"), treeViewContainer, "vtv.allNodesChecked");
    }
  };
  
  /**
   * Changes the state of every open node, but not their children, so that they are checked.
   * But only if we are showing checkboxes.
   * 
   * @param {type} options
   */
  function checkAllOpenedNodes (options) {
    if (!usedOptions.checkboxes) {
      return;
    }
    
    var openedLisCheckboxes = treeViewContainer.querySelectorAll(".treeNode.expanded > .treeNodeItem > .treeNodeCheckbox > input");
    
    openedLisCheckboxes.forEach(function (cb) {
      cb.setAttribute("checked", "");
      
      var li = cb.parentNode.parentNode.parentNode;
      var index = li.getAttribute("data-index");
      var _node = findMatchingTreeNode(index, [treeNode]);
      // Change state of the data node, but only that
      changeState(_node, "checked", true, false);
    });
    
    if (!options.silent) {
      triggerEvent(treeViewContainer.querySelector(".treeBranch.root"), treeViewContainer, "vtv.allOpenedNodesChecked");
    }
  };
  
  /**
   * Expands every node
   * 
   * @param {Mixed} obj
   * @param {Object} options
   */
  function expand (obj, options) {
    
    var bundle = getNodeBundle(obj);
    
    var index = bundle[0];
    var node = bundle[1];
    var _node = bundle[2];
    var parent = bundle[3];
    
    // Change state of the data node, but not the children
    changeState(_node, "expanded", true, false); // Makes the associated data node expanded as well
    
    node.classList.add("expanded");
    
    if (!options.silent) {
      triggerEvent(node, parent, "vtv.nodeExpanded");
    }
  };
  
  /**
   * Expands every node in the tree
   * 
   * @param {Object} options
   */
  function expandAll (options) {
    
    var nodes = treeViewContainer.querySelectorAll(".treeNode.expandable");
    nodes.forEach(function (node) {
      if (!node.classList.contains("expanded")) {
        node.classList.add("expanded");
      }
    });
    // Change state of the data node, but not the children
    changeState(nodeTree, "expanded", true, false); // Makes the associated data node expanded as well
    
    if (!options.silent) {
      triggerEvent(treeViewContainer.querySelector(".treeBranch.root"), treeViewContainer, "vtv.allNodesExpanded");
    }
  };
  
  /**
   * Collapses a single node.
   * 
   * @param {Mixed} obj
   * @param {Obect} options
   */
  function collapse (obj, options) {
    
    var bundle = getNodeBundle(obj);
    
    var index = bundle[0];
    var node = bundle[1];
    var _node = bundle[2];
    var parent = bundle[3];
    
    node.classList.remove("expanded");
    
    // Change state of the data node, but not the children
    changeState(_node, "expanded", false, false); // Makes the associated data node collapsed as well
    
    if (!options.silent) {
      triggerEvent(node, parent, "vtv.nodeCollapsed");
    }
  };
  
  /**
   * Collapses every node in the tree
   * 
   * @param {Object} options
   */
  function collapseAll (options) {
    
    var nodes = treeViewContainer.querySelectorAll(".treeNode.expandable");
    nodes.forEach(function (node) {
      node.classList.remove("expanded");
    });
    
    // Change state of the data node recursivly
    changeState(nodeTree, "expanded", false, true); // Makes the associated data node collapsed as well
    
    if (!options.silent) {
      triggerEvent(treeViewContainer.querySelector(".treeBranch.root"), treeViewContainer, "vtv.allNodesCollapsed");
    }
  };
  
  /**
   * Returns every nodes where its checkbox is checked
   * 
   * @param {Mixed} obj
   * @param {Object} options
   * @returns {NodeList|Array}
   */
  function getChecked (obj) {
    var openedLisCheckboxes = treeViewContainer.querySelectorAll("input:checked");
    
    var ret = [];
    
    openedLisCheckboxes.forEach(function (cb) {
      ret[ret.length] = cb.parentNode.parentNode.parentNode;
    });
    
    return ret;
  };
  
  /**
   * Returns all the expanded nodes.
   * 
   * @param {Object} options
   * @returns {NodeList|Array}
   */
  function getExpanded () {
    return treeViewContainer.querySelectorAll(".treeNode.expanded");
  };
  
  /**
   * Returns a list of collapsed nodes, that is not a child of an opened one
   * 
   * @param {type} options
   * @returns {NodeList|Array}
   */
  function getCollapsed () {
    
    var ret = [];
    
    var nodes = treeViewContainer.querySelectorAll(".treeNode:not(.expanded)");
    nodes.forEach(function (node) {
      
      if (!isChildOfExpanded(node)) {
        ret[ret.length] = node;
      }
      
    });
    
    return new _NodeList(ret);
  };
  
  /**
   * Returns all data nodes
   * 
   * @returns {Array|Object}
   */
  function getAllNodes () {
    return nodeTree;
  };
  
  /**
   * Returns the entire visual tree
   * 
   * @returns {NodeList}
   */
  function getAllElements () {
    return treeViewContainer.children;
  };
  
  /**
   * Returns a boolean value, depending on whether the "child" is a decendent
   * of an expanded node
   * 
   * @param {HTMLElement} child
   * @returns {Boolean}
   */
  function isChildOfExpanded (child) {
    
    var p = child.parentNode;
    while (p !== treeViewContainer && !p.classList.contains("expanded")) {
      p = p.parentNode;
    }
    
    return p.classList.contains("expanded");
  };
  
  /**
   * Returns the matching data node
   * 
   * @param {String} index
   * @param {NodeList|Array} nodes
   * @returns {Object}
   */
  function findMatchingTreeNode (index, nodes) {
    
    var indexes = index.split(".");
    var parent = null;
    for (var i = 0; i < indexes.length; i++) {
      var x = indexes[i];
      if (parent === null) {
        parent = nodes[x]; // Root
        if (parent.index === index) {
          return parent;
        }
      } else {
        var x = indexes[i];
        var node = parent.nodes[x];
        if (node.index === index) {
          return node;
        }
        parent = node;
      }
    }
    
    return null; // Not found
  };
  
  /**
   * Removes the node from "nodes" that matches "index".
   * Returns true if removed
   * 
   * @param {String} index
   * @param {NodeList|Array} nodes
   * @returns {Boolean}
   */
  function removeFromTree (index, nodes) {
    var ret = false;
    for (var l = nodes.length - 1; l >= 0; l--) {
      var f = nodes[l];
      if (f === undefined) {
        continue;
      }
      if (index === f.index) {
        nodes.splice(l, 1);
        return true;
      }
      ret = removeFromTree(index, f.nodes);
      if (ret) {
        return ret;
      }
    }
    return false;
  };
  
  /**
   * Called when the user starts to drag
   * 
   * @param {Event} ev
   */
  function dragStart (ev) {
    var t = ev.target;
    t.setAttribute("data-class", t.className);
    movingNode = t;
    this.classList.add("hold");
    setTimeout(function () {
      t.classList.add("dragging");
    }, 0);
    
    triggerEvent(t, treeViewContainer, "vtv.nodeDragStarted");
  };
  
  /**
   * Called when the drag is over
   * 
   * @param {Event} ev
   */
  function dragEnd (ev) {
    var t = ev.target;
    t.className = t.getAttribute("data-class");
    
    triggerEvent(t, t, "vtv.nodeDragEnded");
  };
  
  /**
   * Called when ever the dragged node is over another.
   * 
   * @param {Event} ev
   */
  function dragOver(ev) {
    ev.preventDefault();
    var t = ev.target;
    
    triggerEvent(movingNode, t, "vtv.nodeDragOver");
  };

  /**
   * Called when dragged node enters another.
   * 
   * @param {Event} ev
   */
  function dragEnter(ev) {
    ev.preventDefault();
    var t = ev.target;
    t.classList.add("hovered");
    
    if (elementBefore !== null && elementBefore.parentNode !== null) {
      elementBefore.parentNode.removeChild(elementBefore);
      elementAfter.parentNode.removeChild(elementAfter);
    }
    
    elementBefore = createSpanner("top");
    elementAfter = createSpanner("bottom");
    t.appendChild(elementBefore);
    t.appendChild(elementAfter);
    
    triggerEvent(movingNode, t, "vtv.nodeDragEnter");
  };
  
  /**
   * Called when the moving node exits another
   * 
   * @param {Event} ev
   */
  function dragLeave(ev) {
    var t = ev.target;
    t.classList.remove("hovered");
    triggerEvent(movingNode, t, "vtv.nodeDragLeaved");
  };
  
  /**
   * Moves a data node from one array to another
   * @param {type} fromArray
   * @param {type} fromIndex
   * @param {type} toArray
   * @param {type} toIndex
   */
  function moveDataNode (fromArray, fromIndex, toArray, toIndex) {
    var element = fromArray.splice(fromIndex, 1);
    toArray.splice(toIndex, 0, element[0]);
  }
  
  /**
   * Returns the parent data node of the given index
   * 
   * @param {type} index
   * @returns {Object}
   */
  function getParentDataNode (index) {
    var indexes = index.split(".");
    var parent = null;
    var _node = null;
    var nodes = nodeTree;
    for (var i = 0; i < indexes.length; i++) {
      var x = indexes[i];
      _node = parent;
      if (parent === null) {
        parent = nodes[x]; // Root
        if (parent.index === index) {
          return _node;
        }
      } else {
        var x = indexes[i];
        var node = parent.nodes[x];
        if (node === null || node === undefined) {
          return parent;
        }
        parent = node;
        if (parent.index === index) {
          return _node;
        }
      }
    }
    
    return null; // Not found
  }
  
  /**
   * Called when the moving node has been dropped.
   * This results in the moving node shifting its place.
   * A reindexing is necessary!
   * 
   * @param {Event} ev
   */
  function dragDrop(ev) {
    var t = ev.target;
    t.classList.remove("hovered");
    
    var y = ev.layerY;
    if (y <= 10) {
      var p = t.parentNode; // p is a branch
      var fromIndex = movingNode.getAttribute("data-index");
      var fromIds = fromIndex.split(".");
      
      var fromId = fromIds[fromIds.length - 1];
      var fromNode = getParentDataNode(fromIndex);
      
      var toIndex = t.getAttribute("data-index");
      var toIds = toIndex.split(".");
      var toId = toIds[toIds.length - 1];
      var toNode = getParentDataNode(toIndex);
      
      p.insertBefore(movingNode, t); // Move the element node
      moveDataNode(fromNode.nodes, fromId, toNode.nodes, toId);
      
      rebuildIndexes(treeViewContainer.querySelector(":scope > ul.treeBranch"), {nodes:nodeTree}); // Rebuild the indexes, now that the tree has a new order
      
      // Remove the top and bottom elements
      if (elementBefore !== null && elementBefore.parentNode !== null) {
        elementBefore.parentNode.removeChild(elementBefore);
        elementAfter.parentNode.removeChild(elementAfter);
      }
    } else if (y >= t.offsetHeight - 10) {
      var p = t.parentNode; // p is a branch
      var fromIndex = movingNode.getAttribute("data-index");
      var fromIds = fromIndex.split(".");
      
      var fromId = fromIds[fromIds.length - 1];
      
      var fromNode = getParentDataNode(fromIndex);
      
      var toIndex = t.getAttribute("data-index");
      var toIds = toIndex.split(".");
      var toId = parseInt(toIds[toIds.length - 1], 10) + 1;
      var toNode = getParentDataNode(toIndex);
      
      var p = t.parentNode; // p is a branch
      p.insertBefore(movingNode, t.nextSibling);
      moveDataNode(fromNode.nodes, fromId, toNode.nodes, toId);
      
      rebuildIndexes(treeViewContainer.querySelector(":scope > ul.treeBranch"), {nodes:nodeTree}); // Rebuild the indexes, now that the tree has a new order
      
      // Remove the top and bottom elements
      if (elementBefore !== null && elementBefore.parentNode !== null) {
        elementBefore.parentNode.removeChild(elementBefore);
        elementAfter.parentNode.removeChild(elementAfter);
      }
    } else {
      var p = t.parentNode; // p is a branch
      var fromIndex = movingNode.getAttribute("data-index");
      var fromIds = fromIndex.split(".");
      
      var fromId = fromIds[fromIds.length - 1];
      
      var fromNode = getParentDataNode(fromIndex);
      
      var toIndex = t.getAttribute("data-index");
      var toIds = toIndex.split(".");
      var toId = parseInt(toIds[toIds.length - 1], 10) + 1;
      var toNode = getParentDataNode(toIndex + ".0");
      
      // Find where we should place it
      var branch = t.querySelector(".treeBranch");
      if (!branch) {
        // Create it if not existing
        branch = getBranchTemplate();
        t.appendChild(branch);
      }

      // Remove the top and bottom elements
      if (elementBefore !== null && elementBefore.parentNode !== null) {
        elementBefore.parentNode.removeChild(elementBefore);
        elementAfter.parentNode.removeChild(elementAfter);
      }

      if (branch.parentNode === movingNode) {
        return;
      }
      branch.appendChild(movingNode);
      moveDataNode(fromNode.nodes, fromId, toNode.nodes, toId);
      // Add
      if (!t.classList.contains("expandable")) {
        t.classList.add("expandable");
      }
      rebuildIndexes(treeViewContainer.querySelector(":scope > ul.treeBranch"), {nodes:nodeTree}); // Rebuild the indexes, now that the tree has a new order
    }
    
    triggerEvent(movingNode, t, "vtv.nodeDragDropped");
    
    movingNode = null; // It has to be nullified after triggerEvent, as we are using that element
  };
  
  /**
   * Creates a new spanner, which will be used at the "top" or "bottom" based on
   * "where".
   * 
   * @param {String} where
   * @returns {HTMLElement}
   */
  function createSpanner (where) {
    var li = document.createElement("span");
    li.classList.add("treeNode-spanner");
    li.classList.add("spanner-" + where);
    return li;
  };
  
  /**
   * The function that gets called on document.body.click.
   * 
   * @param {Event} ev
   */
  function docClicked (ev) {
    var t = ev.target;
    
    // Check if we have hit the button-close
    if (t.classList.contains("button-close")) {
      closePopup({
        silent: false
      });
    }

    // Check if we have hit the button-save-changes button
    if (t.classList.contains("button-save-changes")) {
      saveChanges();
    }

    // Check if we have hit the button-save-add button
    if (t.classList.contains("button-save-add")) {
      saveAdd();
    }

    // Check if we have hit the button-delete button
    if (t.classList.contains("button-delete")) {
      var p = ev.target.parentNode.parentNode.parentNode; // The <ul>
      if (p.classList.contains("root") && usedOptions.rootDelete) {
        onDelete(ev);
      } else if (!p.classList.contains("root")) {
        onDelete(ev);
      }
    }

    // Check if we have hit the button-change button
    if (t.classList.contains("button-change")) {
      onEdit(ev, {
        silent: false
      });
    }

    // Check if we have hit the button-add button
    if (t.classList.contains("button-add")) {
      onAdd(ev, {
        silent: false
      });
    }

    // Check if we have hit the expand/collapse icon
    if (t.classList.contains("treeNodeExpandIcon")) {
      // Find the parent
      var node = t.parentNode.parentNode;
      // Check if it can be expanded
      if (node.classList.contains("expandable")) {
        // Toggle the "expanded" class
        t.parentNode.parentNode.classList.toggle("expanded");
      }
    }

    // Check if we have hit a node
    if (t.classList.contains("treeNode")) {
      if (usedOptions.showControlsOnHover) {
        docMousedOver({
          target: t
        });
      }
      
      var bundle = getNodeBundle(t);
      var _node = bundle[2];
      // Check if the node is selectable
      if (_node.selectable === undefined || _node.selectable) {
        // Check if we can select multiple nodes
        if (!usedOptions.selectMultiple) { // We could not
          // Find the selected one, if any
          var selected = treeViewContainer.querySelector(".selected");
          if (selected !== null) {
            // Remove the value "selected"
            selected.classList.remove("selected");
          }
        }
        // Check if we can deselt
        if (usedOptions.canDeselect) { // We could
          // We are just toggling it, as it doesn't matter what state it was in
          t.classList.toggle("selected");
        } else if (!t.classList.contains("selected")) { // It does not already contain "selected"
          // Add the "selected" class
          t.classList.add("selected");
        }
      }
    }
  };
  
  /**
   * The function that gets called on document.body.mousemove.
   * 
   * @param {Event} ev
   */
  function docMousedOver (ev) {
    var t = ev.target;
    if (t.classList.contains("treeNode")) {
      var bar = treeViewContainer.querySelector("#treenodeButtonBar");
      if (bar !== null) {
        bar.parentNode.removeChild(bar);
      }
      
      var bar = document.createElement("span");
      bar.classList.add("treenode-button-bar");
      bar.setAttribute("id", "treenodeButtonBar");
      
      var i;
      var iSpan;
        
        var del = document.createElement("button");
        del.classList.add("treenode-button");
        del.classList.add("button-delete");
        del.setAttribute("draggable", false);
          iSpan = document.createElement("span");
          iSpan.classList.add("treenode-icon");
          iSpan.innerHTML = "&#128465;";
        del.append(iSpan);

        var change = document.createElement("button");
        change.classList.add("treenode-button");
        change.classList.add("button-change");
        change.setAttribute("draggable", false);
          iSpan = document.createElement("span");
          iSpan.classList.add("treenode-icon");
          iSpan.innerHTML = "&#128393;";
        change.append(iSpan);

        var add = document.createElement("button");
        add.classList.add("treenode-button");
        add.classList.add("button-add");
        add.setAttribute("draggable", false);
          iSpan = document.createElement("span");
          iSpan.classList.add("treenode-icon");
          iSpan.innerHTML = "&#10133;";
        add.append(iSpan);
      
      bar.appendChild(del);
      bar.appendChild(change);
      bar.appendChild(add);
      t.appendChild(bar);
    }
  };
  
  /**
   * The function that gets called on document.body.mouseout.
   * 
   * @param {Event} ev
   */
  function docMousedOut (ev) {
    var t = ev.target;
    if (t.classList.contains("treeNode")) {
      
      var e = ev.toElement || ev.relatedTarget;
      if ((e && e.parentNode === t) || (e && e.parentNode.parentNode === t) || (e && e === t)) {
         return;
      }
      
      var bar = t.querySelector("#treenodeButtonBar");
      if (bar === null) {
        return;
      }
      
      t.removeChild(bar);
    }
  };
  
  function getParentLi (node) {
    var par = node.parentNode;
    while (par.tagName.toLowerCase() !== "li") {
      par = par.parentNode;
    }
    
    return par;
  }
  
  /**
   * Creates a popup, to be used for changing a nodes text.
  
   * @returns {Array}
   */
  function createChangePopup () {
    closePopup({
      silent: true
    });
    var popup = document.createElement("span");
    popup.classList.add("treeview-popup");
    popup.setAttribute("id", "treeviewPopup");
    
      var top = document.createElement("span");
        var close = document.createElement("button");
        close.setAttribute("type", "button");
        close.classList.add("button-close");
        close.innerHTML = "&times;";
      top.appendChild(close);
    popup.appendChild(top);
    
      var bottom = document.createElement("span");
        var text = document.createElement("input");
        text.setAttribute("type", "text");
        var button = document.createElement("button");
        button.setAttribute("type", "button");
        button.classList.add("button-save-changes");
        button.innerHTML = "Change";
      
      bottom.appendChild(text);
      bottom.appendChild(button);
    popup.appendChild(bottom);
    window.setTimeout(function () {
      popup.classList.add("show");
    });
    
    return [popup, text, button];
  };
  
  /**
   * Creates a popup, to be used for adding a new node.
   * 
   * @returns {Array}
   */
  function createAddPopup () {
    closePopup({
      silent: true
    });
    var popup = document.createElement("span");
    popup.classList.add("treeview-popup");
    popup.setAttribute("id", "treeviewPopup");
    
      var top = document.createElement("span");
        var close = document.createElement("button");
        close.setAttribute("type", "button");
        close.classList.add("button-close");
        close.innerHTML = "&times;";
      top.appendChild(close);
    popup.appendChild(top);
    
      var bottom = document.createElement("span");
        var text = document.createElement("input");
        text.setAttribute("type", "text");
        var button = document.createElement("button");
        button.setAttribute("type", "button");
        button.classList.add("button-save-add");
        button.innerHTML = "Add";
      
      bottom.appendChild(text);
      bottom.appendChild(button);
    popup.appendChild(bottom);
    window.setTimeout(function () {
      popup.classList.add("show");
    }, 0);
    
    return [popup, text, button];
  };
  
  /**
   * Closes either one of the possible popups, if they exist.
   * 
   * @param {Object} options
   */
  function closePopup (options) {
    var _treeviewPopup = document.querySelector("#treeviewPopup");
    var close;
    if (_treeviewPopup) {
       close = _treeviewPopup.querySelector("button.button-close");
      _treeviewPopup.parentNode.removeChild(_treeviewPopup);
      
      if (!options.silent) {
        triggerEvent(close, _treeviewPopup, "vtv.popupClosed");
      }
    }
  };
  
  /**
   * 
   * @param {HTMLElement} source
   * @param {HTMLElement} target
   * @param {String} type
   * @param {Object} addt
   */
  function triggerEvent (source, target, type, addt) {
    // Check if "addt" is not set. If it isn't, then create a dummy object
    if (addt === null || addt === undefined) {
      addt = {};
    }
    
    // Merges the data together with the additional data. We are setting "data" with the data given, so that the user can see where the target and source is from
    var data = merge({
      target: target,
      source: source
    }, addt);
    var event = new Event(type, {
      bubbles: true
    });
    event.data = data;
    source.dispatchEvent(event);
  };
  
  /**
   * Changes the state of the data node.
   * If the data node doesn't have the state option, one will be created.
   * 
   * @param {HTMLElement} node
   * @param {String} state
   * @param {Mixed} value
   * @param {Boolean} recursive
   */
  function changeState (node, state, value, recursive) {
    // Create the state object, if it does not exist
    if (!node.state) {
      node.state = {};
    }
    
    // Set the value
    node.state[state] = value;
    
    // Do a loop on the nodes, adding the state, if "recursive" is set to true
    if (recursive) {
      var nodes = node.nodes || [];
      
      for (var i = 0; i < nodes.length; i++) {
        var node = nodes[i];
        changeState(node, state, value, recursive);
      }
    }
  };
  
  /**
   * Returns an array composed of the index, the element, the data node
   * and the parent of the element, if any.
   * 
   * @param {Mixed} obj
   * @returns {Array}
   */
  function getNodeBundle (obj) {
    var index;
    var node;
    var _node;
    var parent;
    
    // Check what we are dealing with and handle accordingly
    if (typeof obj === "string") { // Index?
      index = obj;
      node = treeViewContainer.querySelector('[data-index="' + index + '"]');
      parent = node.parentNode;
      _node = findMatchingTreeNode(index, nodeTree);
    } else if (obj.style !== undefined) { // HTML element
      node = obj;
      parent = node.parentNode;
      index = obj.getAttribute("data-index");
      _node = findMatchingTreeNode(index, nodeTree);
    } else { // Data node
      _node = obj;
      index = _node.index;
      node = treeViewContainer.querySelector('[data-index="' + index + '"]');
      parent = node.parentNode;
    }
    
    return [index, node, _node, parent];
  };
  
  /**
   * Destroys the entire tree, by removing events and elements, so that the
   * user is free to do with the base container as he/she wishes.
   * Is automaticly called on page exits/refresh/etc.
   */
  function destroy () {
    // Remove event listeners
    
    // Only do these, if we could have moved the element nodes
    if (usedOptions.moveable) {
      document.body.removeEventListener("dragstart", dragStart);
      document.body.removeEventListener("dragend", dragEnd);
      document.body.removeEventListener('dragover', dragOver);
      document.body.removeEventListener('dragenter', dragEnter);
      document.body.removeEventListener('dragleave', dragLeave);
      document.body.removeEventListener('drop', dragDrop);
    }
    
    // Only do these, if the controls was shown on hover, not click
    if (usedOptions.showControlsOnHover) {
      document.body.removeEventListener("mouseover", docMousedOver);
      document.body.removeEventListener("mouseout", docMousedOut);
    }
    
    // Remove the global click
    document.body.removeEventListener("click", docClicked);
    
    // Remove the visual tree from the DOM
    treeViewContainer.innerHTML = "";
    
    // Nullify what should be nullified, so that it can be garbage collected
    editingNode = null;
    _editingNode = null;
    treeViewContainer = null;
    originalNodes = null;
    nodeTree = null;
    movingNode = null;
    elementBefore = null;
    elementAfter = null;
  }
  
  // Returns the class
  return TreeView;
})();