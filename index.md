VanillaTree
===========

100% pure vanilla extract with no need for extra flavor!

Checkout https://danfrom.github.io/vanillatree/demo for a demo

* * *

Description
-----------

A treeview with no dependencies on anything. No jQuery. No underscore. No Font Awesome. Nothing but a newer browser, that has JavaScript enabled.  
It is written in pure and clean vanilla JavaScript, that can be runned everywhere, no matter if you are using a framework or not.  
Using unicode characters as icons, minimizes size and loadtime.  
Comes with 2 possible styles. Default which is a white and blue tones, while the other, dark, is made of a dark gray and white tone.  
It is easy to add new styles or change the existing once.  
It is possible to add, remove and change node values. If allowed, then it is also possible to move the nodes around the tree.  
If you are loading a rather large tree, then a loading screen will be shown, until the entire tree has been parsed.  
If you make a mistake, then it is possible to revert back to the original tree.

Usage
-----

First install the JS and CSS files and include them in your HTML  
Then create a container for the treeview.

    
        // How the tree should look like. Every node MUST have a "text" key, the rest is optional
        var nodeTree = {
          "text": "root",
          "nodes": [
             {
              "text": "Level 1 part 1",
              "nodes": [{...}]
            },
             {
              "text": "Level 1 part 2",
              "nodes": [{...}]
            },
             {
              "text": "Level 1 part 3",
              "nodes": [{...}]
            }
          ]
        };
    
        // Instantiates a new VanillaTree
        var vt = new VanillaTree(document.querySelector("#treeview"), nodeTree, options);
    
        vt("expandNode", "0"); // Expands the root node. Here is given a string index as "node"
    
        vt("collapseNode", document.body.querySelector("SPECIFIC_IDENTIFICATION")); // Collapses the node at 0 > 5 > 1. Here is given an HTML element as "node"
    
        vt("getBundle", "0.5.1"); // Will return an array of index, HTML Element, data node and the HTML elements parent
    
        vt("checkNode, {text:"SOMETHING", index: "0.1.4", ...}); // Will mark the matching checkbox as selected. Here is given a data object as "node"
    
        vt("rebuild", {silent: true}); // Will rebuild the entire tree, but not trigger an event
      

Methods (and their options)
---------------------------

*   getIndexesOfSelected ()
*   getBundle (node)
*   rebuild ({silent}
*   expand (node, {silent})
*   expandAll ({silent}
*   collapse (node, {silent})
*   collapseAll ({silent}
*   getAllNodes ()
*   getAllElements ()
*   addNode (node, {silent})
*   addNodeBefore (node, nodeBefore, {silent})
*   addNodeAfter (node, nodeAfter, {silent})
*   remove (node, {silent, fadeOnRemove})
*   getExpanded ()
*   getCollapsed ()
*   checkNode (node, {silent})
*   checkAllNodes ({silent})
*   checkAllOpenedNodes ({silent}

**Watch out with calling "rebuild", as it will render the entire DOM tree again, which can take some time, if a large data tree large provided!**

The methods where there is a "node" in the variables, the node can be either a string (ex. 0.1.4), an element node or a data node.  
If one wants everything about a single node, one can call "getBundle" which will return: the index (ex. 0.2.7), the DOM node, the data node and the DOM nodes parent, in that order. By giving "getBundle" the given DOM parent, the same thing will happen and one can traverse backwards down the tree.  
Most of the methods takes an option object with the key "silent" (defaults to false), that, if set to true, will result in the method not casting any events.  
"remove" takes an additional option, fadeOnRemove (defaults to true), that, if set to true, will fade out the element node, before removing it from the DOM and the data tree.

Initalize options
-----------------

*   animationLength: double (defaults to .5) /* The length of the animations. Must match the CSS speed
*   animations: true/false (defaults to true) /* Whether or not to use animations */
*   canDeselect: true/false (defaults to true) /* Whether the user can deselect a node after it has been selected */
*   checkboxFirst: true/false (default to false) /* Whether or not the checkboxes should be shown before the expand/collapse button. Only used if below is true */
*   checkboxes: true/false (defaults to false) /* Whether or not to show checkboxes */
*   fadeOnRemove: true/false (defaults to true)/* When removing a node, fade out before */
*   maxLevels: int (defaults to -1 (infinite)) /* Max branches the tree can get. -1 is infinite */
*   moveable: true/false (defaults to true) /* If the node element can be moved to another place */
*   rootDelete: true, false (defaults to false) /* Whether or not the root can be deleted. If true and the node is deleted, there is no way of adding new elements. Unless one program it. There are actions for it */
*   selectMultiple: true, false (defaults to false) /* Whether or not the user can select multiple nodes */
*   showControlsOnHover: true/false (defaults to true) /* Show controls on hover or on select */
*   style: string (defaults to "") /* Which style to use. Default, dark and more coming */

How a data node looks like
--------------------------

    `var fullNode = {
        text: "", // The text the node shall have // Needed
        index: "", // The index of the node. Like: 0.3.1 // Optional
        selectable: true, // Should one could select the node // Optional
        checkable: true, // Is it possible to check the node // Optional
        state: { // Holds the different states the node can have // Optional
          expanded: true, // If true, then the element node will be expanded from the start // Optional
          selected: true // If true, then the element node will be selected from the start. Only used if selectable is true // Optional
        }, // Optional
        hideCheckbox: true, // Should the checkboxes be hidden. If true, no checkboxes will be added and neither will it be possible to later on // Optional
        nodes: [] // The nodes that this node contains // Optional
      };` 
  

Everything is optional, excepts the "text" key. It has to be set.  
The "index" value **can** be changed, so don't count on it staying the same after insertion.  

Events
------

*   vtv.buildDone /* Triggered when done building the DOM Tree */
*   vtv.nodeAdded /* Triggered when a node is added */
*   vtv.nodeAddedBefore /* Triggered when a node has been added before another */
*   vtv.nodeAddedAfter /* Triggered when a node has been added after another */
*   vtv.nodeRemoved /* Triggered when a node has been removed */
*   vtv.nodeChanged /* Triggered when a node has been changed (that is the text value has been changed). It will, in the "data" key, find what the value was before and what it is now */
*   vtv.nodeChecked /* Triggered when a node has been checked */
*   vtv.allNodesChecked /* Triggered when all the nodes has been checked */
*   vtv.allOpenedNodesChecked /* Triggered when all opened nodes has been checked */
*   vtv.nodeExpanded /* Triggered when a node has been expande */
*   vtv.allNodesExpanded /* Triggered when all the nodes has been expanded */
*   vtv.nodeCollapsed /* Triggered when a node has been collapsed */
*   vtv.allNodesCollapsed /* Triggered when all the nodes has been collapsed */
*   vtv.nodeDragStarted /* Triggered when a node has been begun to drag */
*   vtv.nodeDragEnded /* Triggered when the node has stopped being dragged */
*   vtv.nodeDragOver /* Triggered when a node is over another node */
*   vtv.nodeDragEnter /* Triggered when a node enters another node */
*   vtv.nodeDragLeaved /* Triggered when a node leaves another node */
*   vtv.nodeDragDropped /* Triggered when a node is being dropped on another, either directly or on one of the top or bottom hotspots */
*   vtv.popupClosed /* Triggered when the popup (either add or change popup) is being closed. Not triggered when adding another popup */
