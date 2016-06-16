import mouseMath from './mouseMath.js'
import Debug from './debug.js'
import InputManager from './InputManager.js'
import SelectionManager from './SelectionManager.js'

import React, { PropTypes } from 'react'
import { findDOMNode } from 'react-dom'

function makeSelectable( Component, options = {}) {
  const { containerDiv = true, sorter = (a, b) => a - b, nodevalue = (node) => node.props.value } = options
  if (!Component) throw new Error("Component is undefined")
  const displayName = Component.displayName || Component.name || 'Component'

  return class extends React.Component {
    static displayName = `Selection(${displayName})`
    constructor(props) {
      super(props)
      this.containerDiv = containerDiv
      this.state = {
        selecting: false,
        selectedNodes: {},
        selectedNodeList: [],
        selectedValues: {},
        selectedValueList: []
      }
      this.selectionManager = new SelectionManager(this, props)
    }

    static propTypes = {
      clickTolerance: PropTypes.number,
      constantSelect: PropTypes.bool,
      selectable: PropTypes.bool,
      preserveSelection: PropTypes.bool,
      selectIntermediates: PropTypes.bool,
      onSelectSlot: PropTypes.func,
      onFinishSelect: PropTypes.func,
      onMouseDown: PropTypes.func,
      onTouchStart: PropTypes.func
    }

    static defaultProps = {
      clickTolerance: 2,
      constantSelect: false,
      selectable: false,
      preserveSelection: false,
      selectIntermediates: false
    }

    static childContextTypes = {
      selectionManager: PropTypes.object,
      selectedNodes: PropTypes.object,
      selectedValues: PropTypes.object
    }

    updateState(selecting, nodes, values) {
      if (Debug.DEBUGGING.debug && Debug.DEBUGGING.selection) {
        Debug.log('updatestate: ', selecting, nodes, values)
      }
      const newnodes = nodes === null ? this.state.selectedNodes : nodes
      const newvalues = values === null ? this.state.selectedValues : values
      this.setState({
        selecting: selecting === null ? this.state.selecting : selecting,
        selectedNodes: newnodes,
        selectedValues: newvalues,
        containerBounds: this.bounds
      })
      if (this.props.onSelectSlot && this.props.constantSelect) {
        const nodelist = Object.keys(newnodes).map((key) => newnodes[key]).sort((a, b) => nodevalue(a.node) - nodevalue(b.node))
        const valuelist = Object.keys(newvalues).map((key) => newvalues[key]).sort(sorter)
        if (Debug.DEBUGGING.debug && Debug.DEBUGGING.selection) {
          Debug.log('updatestate onSelectSlot', values, nodes, valuelist, nodelist, this.bounds)
        }
        if (this.props.onSelectSlot) {
          this.props.onSelectSlot(values, () => nodes, valuelist, () => nodelist, this.bounds)
        }
      }
    }

    propagateFinishedSelect() {
      if (!this.props.onFinishSelect) return
      const newnodes = this.state.selectedNodes
      const newvalues = this.state.selectedValues
      const nodelist = Object.keys(newnodes).map((key) => newnodes[key]).sort((a, b) => sorter(nodevalue(a.node), nodevalue(b.node)))
      const valuelist = Object.keys(newvalues).map((key) => newvalues[key]).sort(sorter)
      if (Debug.DEBUGGING.debug && Debug.DEBUGGING.selection) {
        Debug.log('finishselect', newvalues, newnodes, valuelist, nodelist, this.bounds)
      }
      this.props.onFinishSelect(newvalues, () => newnodes, valuelist, () => nodelist, this.bounds)
    }

    getChildContext() {
      return {
        selectionManager: this.selectionManager,
        selectedNodes: this.state.selectedNodes,
        selectedValues: this.state.selectedValues
      }
    }

    componentWillUnmount() {
      if (this.inputManager) {
        this.inputManager.unmount()
      }
    }

    invalid(e, eventname) {
      if (eventname === 'touchstart') {
        if (this.props.onTouchStart) {
          this.props.onTouchStart(e)
        }
      } else {
        if (this.props.onMouseDown) {
          this.props.onMouseDown(e)
        }
      }
    }

    start(bounds, mouseDownData, selectionRectangle) {
      this.bounds = bounds
      this.mouseDownData = mouseDownData
      if (this.props.constantSelect) {
        this.selectionManager.select(selectionRectangle, this.state, this.props)
      } else {
        this.selectionManager.deselect(this.state)
      }
    }

    cancel() {
      this.selectionManager.deselect(this.state)
      this.propagateFinishedSelect()
      this.setState({ selecting: false })
    }

    end(e, mouseDownData, selectionRectangle) {
      if (this.props.constantSelect && !this.props.preserveSelection) {
        this.propagateFinishedSelect()
        this.selectionManager.deselect(this.state)
        return
      }
      this.selectionManager.select(selectionRectangle, this.state, this.props)
      this.propagateFinishedSelect()
    }

    change(selectionRectangle) {
      const old = this.state.selecting

      if (!old) {
        this.setState({selecting: true})
      }

      if (this.props.constantSelect) {
        this.selectionManager.select(selectionRectangle, this.state, this.props)
      }
    }

    makeInputManager(ref) {
      if (!ref) return
      if (this.ref === ref) return
      if (this.inputManager) this.inputManager.unmount()
      this.ref = ref
      this.inputManager = new InputManager(ref, this, this)
    }

    render() {
      if (this.containerDiv) {
        return (
          <div
            ref={(ref) => this.makeInputManager(ref)}
          >
            <Component
              {...this.props}
              {...this.state}
            />
          </div>
        )
      }
      return (
        <Component
          {...this.props}
          {...this.state}
          ref={(ref) => this.makeInputManager(ref)}
        />
      )
    }
  }
}

export default makeSelectable
