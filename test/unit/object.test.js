1&&
( function ( $, assert, undefined ) {

module( "State.object" );

var	State = state.State,
	StateController = state.StateController;

test( "Object creation", function () {
	var x = new TestObject,
		arr;
	assert.ok( x.state().controller() instanceof StateController, "StateController created" );
	
	assert.ok( x.state('Waiting') instanceof State, "State 'Waiting' created" );
	assert.ok( x.state('Waiting').method( 'methodOne', false, false ), "Method 'methodOne' in state 'Waiting' created" );
	assert.ok( x.state().is('Waiting'), "In state 'Waiting'" );
	assert.equal( x.methodOne(), 'Waiting.methodOne', "methodOne() on TestObject returns proper method for state 'Waiting'" );
	
	assert.ok( x.state('Active') instanceof State );
	assert.ok( x.state('Active.Hyperactive') instanceof State );
	assert.ok( !x.state('Active').method( 'methodOne', false, false ) );
	assert.ok( x.state('Active').method( 'methodTwo', false, false ) );
});

test( "Null state change", function () {
	var x = new TestObject;
	x.state().change( x.state() );
	assert.ok( x.state().is('Waiting'), "StateController.change() to current state" );
	assert.ok( x.state() === x.state().select(), "State.select() on current state" );
});

test( "Simple state change", function () {
	var x = new TestObject;
	assert.ok( x.state().change('Active'), "Change to state 'Active'" );
	assert.ok( x.state().change('Finished'), "Change to state 'Finished'" );
	assert.ok( x.state().change(), "Change to default state" );
});

test( "State changes from parent state into child state", function () {
	var x = new TestObject(''), result;
	assert.ok( x.state().is(''), "Initialized to default state" );
	assert.ok( result = x.state().change('Finished'), "Changed to state 'Finished' " + result.toString() );
	assert.ok( x.state().change('.CleaningUp'), "Changed to child state 'CleaningUp' using relative selector syntax" );
});

test( "State changes from one child state sibling to another", function () {
	var s;
	var x = new TestObject('Finished');
	assert.ok( x.state().is('Finished'), "Initialized to state 'Finished'" );
	assert.ok( s = x.state().change('Finished'), "Asynchronous state change" );
	assert.ok( x.state().change('Finished.CleaningUp'), "Aborted transition redirected to child state" );
	assert.ok( x.state().change('..Terminated'), "Change to sibling state using relative selector syntax" );
});

test( "Method resolutions", function () {
	var x = new TestObject('');
	assert.equal( x.methodOne(), 'methodOne' );
	assert.equal( x.methodTwo(), 'methodTwo' );
	assert.ok( x.state().change('Waiting'), "State 'Waiting'" );
	assert.equal( x.methodOne(), 'Waiting.methodOne' );
	assert.equal( x.methodTwo(), 'methodTwo' );
	assert.ok( x.state().change('Active'), "State 'Active'" );
	assert.equal( x.methodOne(), 'methodOne' );
	assert.equal( x.methodTwo(), 'Active.methodTwo' );
	assert.ok( x.state().change('Finished'), "State 'Finished'" );
	assert.notEqual( x.methodOne(), 'Finished.methodOne' ); // fails because change('Finished') is delayed
	assert.equal( x.methodTwo(), 'methodTwo' ); // passes because `methodTwo` isn't overridden by Finished
	assert.notEqual( x.methodThree(1,2), 'Finished.methodThree uno=1 dos=2' ); // fails, idem
	x.state().change('Finished.CleaningUp');
	assert.ok( x.state().is('Finished.CleaningUp'), "State 'Finished.CleaningUp'" );
	assert.equal( x.methodOne(), 'Finished.methodOne' );
	assert.equal( x.methodTwo(), 'Finished.CleaningUp.methodTwo' );
	assert.ok( ( x.terminate(), x.state().is('Finished.Terminated') ), "State 'Finished.Terminated'" );
	// assert.ok( x.state().change('..Terminated').state().is('Finished.Terminated'), "State 'Finished.Terminated'" );
	assert.equal( x.methodOne(), 'Finished.methodOne' );
	assert.equal( x.methodTwo(), 'Finished.Terminated.methodTwo' );
	assert.equal( x.methodThree(1,2), 'Finished.Terminated.methodThree : Finished.methodThree uno=1 dos=2' );
});

test( "Rules", function () {
	var x = new TestObject('Finished');
	assert.ok( !x.state().change('Waiting'), "'Finished' to 'Waiting' disallowed" );
	assert.ok( !x.state().change('Active'), "'Finished' to 'Active' disallowed" );
	assert.ok( x.state().change('.Terminated'), "'Finished' to 'Finished.Terminated' allowed" );
	assert.ok( !x.state().change(''), "'Finished.Terminated' to default state disallowed" );
});

test( "Data", function () {
	var NIL = Z.NIL;

	function Class () {
		state( this, {
			data: {
				a: 1,
				b: "2",
				c: [ 3, "4", { 5: "foo" } ],
				d: {},
				e: {
					f: 6,
					g: "7",
					h: [ 8, 9 ]
				}
			},
			State1: {
				data: {
					b: 2,
					c: [ undefined, undefined, { 5: "bar" } ]
				}
			},
			State2: {
				data: {}
			}
		});
	}
	state( Class.prototype, {
		mutate: function ( event, mutation, delta ) {
			assert.ok( true, "mutate event" );
		}
	});
	var o = new Class;
	
	assert.ok( o.state().data(), "Data accessible from `data()`" );
	assert.strictEqual(
		o.state('').data().a,
		o.state('State1').data().a,
		"Substate data inherits primitive-typed data member from superstate"
	);
	assert.notStrictEqual(
		o.state('').data().b,
		o.state('State1').data().b,
		"Substate data overrides primitive-typed data member of superstate"
	);
	assert.strictEqual(
		o.state('State1').data().c[1],
		"4",
		"Substate data inherits data member from superstate through own sparse array"
	);

	o.state('').data({
		a: NIL,
		d: { a: 1 },
		e: {
			g: NIL,
			h: [ undefined, "nine" ]
		}
	});
	assert.deepEqual(
		o.state('').data(),
		{
			b: "2",
			c: [ 3, "4", { 5: "foo" } ],
			d: { a: 1 },
			e: { f: 6, h: [ 8, "nine" ] }
		},
		""
	);
	assert.deepEqual(
		o.state('State1').data(),
		{
			b: 2,
			c: [ 3, "4", { 5: "bar" } ],
			d: { a: 1 },
			e: { f: 6, h: [ 8, "nine" ] }
		},
		""
	);

	// var x = new TestObject;
	// assert.ok( x.state('Finished').data(), "Data accessible from `data()`" );
	// assert.equal( x.state('Finished').data().c, x.state('Finished.Terminated').data().c, "Substate inherits data member from superstate" );
	// assert.notEqual( x.state('Finished').data().a, x.state('Finished.Terminated').data().a, "Substate overrides data member of superstate" );
	// assert.equal( x.state('Finished').data().d.a, x.state('Finished.Terminated').data().d.a, "Substate inherits data member from superstate one level deep" );
	// assert.notEqual( x.state('Finished').data().d.b, x.state('Finished.Terminated').data().d.b, "Substate overrides data member of superstate one level deep" );

	assert.expect( 7 );
});

test( "Destroy", function () {
	var x = new TestObject;
	assert.ok( ( 'isDelegator' in x.methodOne ) && x.state().controller().destroy() && !( 'isDelegator' in x.methodOne ), "Owner method returned" );
})

})( jQuery, QUnit || require('assert') );