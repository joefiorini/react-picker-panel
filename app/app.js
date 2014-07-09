/** @jsx React.DOM */
var HelloMessage = React.createClass({
  render: function() {
    /* jshint ignore:start */
    return <div>Hello {this.props.name}</div>;
    /* jshint ignore:end */
  }
});

React.renderComponent(
  /* jshint ignore:start */
  <HelloMessage name="John" />,
  /* jshint ignore:end */
  document.getElementById('container')
);
