/** @jsx React.DOM */

// 1. Refactor the crap out of this
// 2. Use a realish backend
// 3. Implement a second panel
// 4. Style it
//
var PickerContainer = React.createClass({
  getInitialState: function() {
    return {panelIsOpen: false};
  },
  openPanel: function() {
    this.setState({ panelIsOpen: true });
  },
  valueSelected: function(value) {
    this.setProps({ currentStatus: value });
    this.setState({ panelIsOpen: false });
  },
  render: function() {
    /* jshint ignore:start */

    var a = [<PanelTrigger currentStatus={this.props.currentStatus} onOpenPanel={this.openPanel} />];

    if(this.state.panelIsOpen) {
      a.push(<TransitionOptionsContainer currentStatus={this.props.currentStatus} availableTransitions={this.props.availableTransitions} onSelect={this.valueSelected} />);
    }

    return (<div className="picker-container">
      {a}
    </div>);
    /* jshint ignore:end */
  }
});

var PanelTrigger = React.createClass({
  // Listen on panel value reactor and...
  //  set currentStatus prop to new status
  handleClick: function() {
    this.props.onOpenPanel();
  },
  render: function() {
    /* jshint ignore:start */
    return (<div className="panel__trigger card__status" onClick={this.handleClick}>
      {this.props.currentStatus}
    </div>);
    /* jshint ignore:end */
  }
});

function transitionOption(callback, transition) {
  return (<TransitionOption name={transition} onSelect={callback} />);
}

var TransitionOptionsContainer = React.createClass({
  // Listen for chosen transition and...
    // Perform transition
    // Send new status to panel value reactor
  render: function() {
    console.log(this.props.onSelect);
    return (
      <div className="transition-options-panel">
        {this.props.availableTransitions.map(transitionOption.bind(null, this.props.onSelect))}
      </div>
    );
  }
});

var TransitionOption = React.createClass({
  handleClick: function() {
    this.props.onSelect(this.props.name);
    // Pass selected transition up to parent
  },
  render: function() {
    return (<div className="panel__option" onClick={this.handleClick}>{this.props.name}</div>);
  }
});

var transitions = ['In Progress'];

React.renderComponent(
  /* jshint ignore:start */
  <PickerContainer currentStatus="Backlog" availableTransitions={transitions} />,
  /* jshint ignore:end */
  document.getElementById('container')
);
