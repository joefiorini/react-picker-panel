/** @jsx React.DOM */

// 1. Refactor the crap out of this
// 2. Use a realish backend
// 3. Implement a second panel
// 4. Style it
//

function ComponentState(visible, component) {
  return { isVisible: visible, component: component };
}

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

    var states = [
      ComponentState(true, <PanelTrigger
              currentStatus={this.props.currentStatus}
              onOpenPanel={this.openPanel} />),

      ComponentState(this.state.panelIsOpen,
        <TransitionOptionsContainer
          currentStatus={this.props.currentStatus}
          availableTransitions={this.props.availableTransitions}
          onSelect={this.valueSelected} />)
    ];

    var components =
      states.filter(function(state) {
        return state.isVisible;
      }).map(function(state) {
        return state.component;
      });

    return (<div className="picker-container">
      {components}
    </div>);
    /* jshint ignore:end */
  }
});

var PanelTrigger = React.createClass({
  propTypes: {
    currentStatus: React.PropTypes.string.isRequired,
    onOpenPanel: React.PropTypes.func.isRequired
  },
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

var TransitionOptionsContainer = React.createClass({
  render: function() {
    return (
      <div className="transition-options-panel">
        {this.props.availableTransitions.map(transition => <TransitionOption
                                                              key={transition}
                                                              name={transition}
                                                              onSelect={this.props.onSelect} />)}
      </div>
    );
  }
});

var TransitionOption = React.createClass({
  handleClick: function() {
    this.props.onSelect(this.props.name);
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
