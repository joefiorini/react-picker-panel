// Store defining states
// Monad to perform transitions
//
var _ = bilby;
var States = {
  backlog: _.some('backlog'),
  inProgress: _.some('inProgress'),
  readyForQA: _.some('readyForQA'),
  acceptance: _.some('acceptance'),
  accepted: _.some('accepted'),
  needsMoreWork: _.some('needsMoreWork')
};

function inState(state) {
  return function(t) {
    return t == state;
  };
}


function transitionTo(...states) {
  return function() {
    if(states.length == 2) {
      return _.Tuple2(...states);
    } else if(states.length == 3) {
      return _.Tuple3(...states);
    }
  };
}

var Machine = _.environment().
                method('transition',
                       inState(States.backlog),
                       transitionTo(States.inProgress)).
                method('transition',
                       inState(States.inProgress),
                       transitionTo(States.readyForQA, States.backlog)).
                method('transition',
                       inState(States.readyForQA),
                       transitionTo(States.acceptance, States.needsMoreWork));

_.State.modify((t) => {
  return Machine.transition(t);
});

Machine.states = States;

export default Machine;
