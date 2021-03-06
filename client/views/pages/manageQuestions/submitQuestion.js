Template.submitQuestion.onCreated(function () {
    var template = this;

    //prepare a id for the to be submitted question, so that we know where to dump the file uploads
    template.questionId = Random.id();
    template.uploadedJavadocs = new ReactiveVar(false);
});

Template.submitQuestion.onRendered(function () {
    var template = this;

    //subscribe to tags
    template.subscribe('allTags', function () {
        Tracker.afterFlush(function () {
            //init tooltips
            template.$('[data-toggle=tooltip]').tooltip({
                container: 'body'
            });
        })
    })


});

Template.submitQuestion.helpers({
    config: function () {
        return function(editor) {
            editor.setTheme('ace/theme/crimson_editor');
            editor.getSession().setMode('ace/mode/java');
            editor.setHighlightActiveLine(false);
            editor.setShowPrintMargin(false);
        }
    },
    uploadJarFormData: function () {
        return {
            _id: Template.instance().questionId,
            purpose: 'JAR'
        }
    },
    uploadJavadocsFormData: function () {
        return {
            _id: Template.instance().questionId,
            purpose: 'JAVADOCS'
        }
    },
    uploadJavadocsCallback: function() {
        var template = Template.instance();
        return {
            finished: function(index, fileInfo, context) {
                template.uploadedJavadocs.set(true);
            }
        }
    },
    uploadedJavadocs: function () {
        return Template.instance().uploadedJavadocs.get();
    },
    javadocPath: function () {
        return 'http://kuala.smu.edu.sg/javadocs/' + Template.instance().questionId + '/index.html';
    }

});

Template.submitQuestion.events({
    'click #addTest': function (event, instance) {
        instance.$('#test-container').append('\
            <tr>\
                <td>\
                    <textarea name="description" type="text" class="form-control"></textarea>\
                </td>\
                <td>\
                    <textarea name="prepCode" class="form-control" style="font-family: monospace"></textarea>\
                </td>\
                <td>\
                    <input name="input" type="text" class="form-control" style="font-family: monospace">\
                </td>\
                <td>\
                    <textarea name="output" type="text" class="form-control" style="font-family: monospace"></textarea>\
                </td>\
                <td>\
                    <select name="visibility" class="form-control" >\
                        <option value="SHOW" selected>Show</option>\
                        <option value="HIDDEN">Hidden</option>\
                    </select>\
                </td>\
                <td>\
                    <button class="remove-btn btn btn-white"><i class="fa fa-trash"></i> </button>\
                </td>\
            </tr>'
        );
    },

    'click #returnValueTemplate-btn': function () {
        var editor = ace.edit('editor');
        editor.getSession().setValue('import static javaly.core.Test.*;\n' +
        'import javaly.core.*;\n' +
        'public class StagingMethodTest {\n' +
            '\t@TestCase(expectedOutput="<expectedOutput>")\n' +
            '\tpublic void test0() throws Exception {\n' +
            '\t\tassertEquals("<description>", <expectedOutput>, <Method Call>);\n' +
            '\t}\n' +
        '}');
    },


    'click #systemOutputTemplate-btn': function () {
        var editor = ace.edit('editor');
        editor.getSession().setValue('import static javaly.core.Test.*;\n' +
            'import javaly.core.*;\n' +
            'public class StagingMethodTest {\n' +
            '\t@TestCase(expectedOutput="<expectedOutput>")\n' +
            '\tpublic void test0() throws Exception {\n' +
            '\t\t// Call method that prints to console here\n\n' +
            '\t\tassertEquals("<description>", "<expectedOutput>", retrieveSystemOutput());\n' +
            '\t}\n' +
            '}');
    },

    'click #catchExceptionTemplate-btn': function () {
        var editor = ace.edit('editor');
        editor.getSession().setValue('import static javaly.core.Test.*;\n' +
            'import javaly.core.*;\n' +
            'public class StagingMethodTest {\n' +
            '\tpublic void test0() throws Exception {\n' +
            '\t\t//expectThrowable MUST come before all other code within the method\n' +
            '\t\texpectThrowable("<description>", new Throwable("<message>"));\n' +
            '\t\t//run code that is expected to throw the exception here\n\n\n' +
            '\t}\n' +
            '}');
    },

    'click #hiddenTestTemplate-btn': function () {
        var editor = ace.edit('editor');
        editor.getSession().setValue('import static javaly.core.Test.*;\n' +
            'import javaly.core.*;\n' +
            'public class StagingMethodTest {\n' +
            '\t@TestCase(expectedOutput="<expectedOutput>", hidden=true)\n' +
            '\tpublic void test0() throws Exception {\n' +
            '\t\tassertEquals("<description>", <expectedOutput>, <Method Call>);\n' +
            '\t}\n' +
            '}');
    },

    'click #clear-btn': function () {
        var editor = ace.edit('editor');
        editor.getSession().setValue('');
    },

    'click .remove-btn': function (event, instance) {
        $(event.target).closest('tr').remove();
    },

    'click #submit-btn': function (event, instance) {
        if (AutoForm.validateForm('insertQuestionForm')) {
            var question = {};

            question._id = Template.instance().questionId;
            question.title = AutoForm.getFieldValue('title', 'insertQuestionForm');
            question.tags = AutoForm.getFieldValue('tags', 'insertQuestionForm');
            question.content = AutoForm.getFieldValue('content', 'insertQuestionForm');

            //retrieve editor contents for test code
            var editor = ace.edit('editor');
            var code = editor.getSession().getValue();
            question.testCode = code.length > 0 ? code : undefined;
            question.classname = instance.$('input[name="classname-top"]').val();

            if (!question.testCode) {
                question.classname = AutoForm.getFieldValue('classname', 'insertQuestionForm');
                question.methodName = AutoForm.getFieldValue('methodName', 'insertQuestionForm');
                question.questionType = AutoForm.getFieldValue('questionType', 'insertQuestionForm');
                question.methodType = AutoForm.getFieldValue('methodType', 'insertQuestionForm');
                question.testCases = [];
                instance.$('#test-container>tr').each(function (index, elem) {
                    var $elem = $(elem);
                    var testCase = {
                        description: $elem.find('textarea[name="description"]').val(),
                        prepCode: $elem.find('textarea[name="prepCode"]').val(),
                        input: $elem.find('input[name="input"]').val(),
                        output: $elem.find('textarea[name="output"]').val(),
                        visible: $elem.find('select[name="visibility"]').val() === 'SHOW'
                    };
                    if (testCase.description.length === 0
                        && testCase.prepCode.length === 0
                        && testCase.input.length === 0
                        && testCase.output.length === 0
                    ) {
                        // the whole row is empty, ignore
                    } else {
                        question.testCases.push(testCase);
                    }
                });

                if (!question.methodName || !question.methodType || !question.questionType || question.testCases.length === 0) {
                    swal({
                        title: 'Not so fast',
                        text: '<strong>Please ensure that you:</strong>' +
                                '<br>A) Write a test class OR' +
                                '<br>B) Define your fixedtest with the GUI properly' +
                                '<br>&#8226 Method Name is provided' +
                                '<br>&#8226 Output Type is provided' +
                                '<br>&#8226 Method Type is provided' +
                                '<br>&#8226 At least one test case is defined',
                        type: 'warning',
                        html: true
                    });
                    return;
                }
            }

            Questions.insert(question);

            swal({
                title: "Question Submitted!",
                text: 'Your question is now "Unverified" and cannot be added to exercises, until you solve it first.',
                type: "success",
                showCancelButton: true,
                allowEscapeKey: true,
                confirmButtonText: 'Solve it now!',
                cancelButtonText: 'Back'

            }, function (isConfirm) {
                if (isConfirm) {
                    var attemptId = Attempts.insert({
                        userId: Meteor.userId(),
                        questionId: question._id
                    });
                    Router.go('codepad', {_id: attemptId})
                } else {
                    Router.go('manageQuestions');
                }
            });

            console.log(question._id + ' inserted');

        } else {
            swal('Not so fast','Please ensure that you have filled up the required fields from all tabs!', 'warning');
        }

    }
});


