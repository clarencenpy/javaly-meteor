Template.editor.onRendered(function () {
    //Init timeMe.js
    TimeMe.setIdleDurationInSeconds(15);
    TimeMe.setCurrentPageName('editor');
    TimeMe.initialize();

    var template = this;

    //active status
    var attemptId = template.data;
    Meteor.users.update(Meteor.userId(), {$set: {'profile.activeAttempt': attemptId}});

    ifvisible.on("idle", function(){
        console.log('idle...');
        Meteor.users.update(Meteor.userId(), {$set: {'profile.activeAttempt': null}});
    });

    window.onbeforeunload = function(){
        Meteor.users.update(Meteor.userId(), {$set: {'profile.activeAttempt': null}});
    };

    ifvisible.on("wakeup", function(){
        console.log('active!');
        Meteor.users.update(Meteor.userId(), {$set: {'profile.activeAttempt': attemptId}});
    });
});


Template.editor.events({
    'click #compile-btn': function (event, instance) {
        //display load spinner
        Session.set('executing', true);

        //retrieve active time
        var activeTime = +(TimeMe.getTimeOnCurrentPageInSeconds()).toFixed(1);  //'+' is used to convert String to Number
        TimeMe.resetRecordedPageTime('editor');
        TimeMe.startTimer();
        console.log('Active time: ' + activeTime);


        //retrieve editor contents
        var editor = ace.edit('editor');
        var code = editor.getSession().getValue();

        Meteor.call('compileAndRun', {
            attemptId: Router.current().params._id,
            code: code,
            activeTime: activeTime
        }, function (err, result) {
            if (err) {
                Session.set('compileError', err.error);
                Session.set('compileResult', null);
                Session.set('executing', false);
                return;
            }
            if (result.status === 'testNotDefined') {
                Session.set('compileError', 'The author of this question has not defined any test cases for this question.');
                Session.set('compileResult', null);
            } else if (result.status === 'completed') {
                Session.set('compileResult', result);
                Session.set('compileError', null);
            } else if (result.status === 'unchanged') {
                //load the results of the last attempt
                var attempt = Attempts.findOne(instance.data);
                if (attempt.result.error) {
                    Session.set('compileError', attempt.result.error);
                    Session.set('compileResult', null);
                } else {
                    Session.set('compileResult', attempt.result);
                    Session.set('compileError', null);
                }
            }
            Session.set('executing', false);
        });
    }
});

Template.editor.helpers({
    config: function () {
        return function(editor) {
            editor.setTheme('ace/theme/crimson_editor');
            editor.getSession().setMode('ace/mode/java');
            editor.setHighlightActiveLine(false);
            editor.setShowPrintMargin(false);
        }
    },

    executing: function () {
        return Session.get('executing');
    }
});

Template.editor.destroyed = function () {
    TimeMe.stopTimer();
    Session.set('executing', null);
    Session.set('compileResult', null);
    Session.set('compileError', null);

    //turn ifvisible off
    ifvisible.off('wakeup');
    ifvisible.off('idle');

    Meteor.users.update(Meteor.userId(), {$set: {'profile.activeAttempt': null}});
};
