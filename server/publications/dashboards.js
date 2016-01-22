Meteor.publishComposite('exerciseDashboard', function (groupId, exerciseId) {
    return {
        find: function () {
            return Groups.find(groupId);
        },
        children: [
            {
                //publishing Attempts with all possible combinations of userId-questionId
                find: function (group) {    //topLevelDoc
                    var exercise = _.find(group.exercises, function (exercise) {
                        return exerciseId === exercise._id;
                    });
                    var questions = exercise.questions;
                    var students = group.participants;
                    return Attempts.find({$and: [{questionId: {$in: questions}}, {userId: {$in: students}}]}, {fields: {
                        questionId: 1,
                        userId: 1,
                        totalActiveTime: 1,
                        completed: 1,
                        //'history.date': 1,
                        active: 1
                    }});
                }
            },
            {
                //publishing question titles
                find: function (group) {
                    var exercise = _.find(group.exercises, function (exercise) {
                        return exerciseId === exercise._id;
                    });
                    return Questions.find({_id: {$in: exercise.questions}}, {fields: {
                        title: 1
                    }});
                }
            },
            {
                //publish student info
                find: function (group) {
                    return Meteor.users.find({_id: {$in: group.participants}}, {fields: {
                        'profile.name': 1
                    }})
                }
            }
        ]
    }
});

Meteor.methods({
    history: function (attemptId) {
        return Attempts.findOne(attemptId, {fields: {
            history: 1
        }});
    },
    boxplot: function (groupId, exerciseId) {
        var group = Groups.findOne({_id: groupId, 'exercises._id': exerciseId}, {fields: {
            exercises: 1,
            participants: 1
        }});
        var exercise = group.exercises[0];
        var boxplotMatrix = [];
        var questionTitles = [];
        var studentMatrix = {};

        _.each(exercise.questions, function (questionId) {
            var solveTimesForQuestion = [];
            _.each(group.participants, function (userId) {
                var attempt = Attempts.findOne({questionId: questionId, userId: userId}, {fields: {
                    completed: 1,
                    totalActiveTime: 1
                }});

                var name = Meteor.users.findOne(userId).profile.name;
                var solveTime = null;
                if (attempt && attempt.completed) { //note: this calculation ignores uncompleted attempts
                    solveTime = Math.round(attempt.totalActiveTime * 10) / 10;
                    solveTimesForQuestion.push(solveTime);
                    if (studentMatrix[name] === undefined) {
                        studentMatrix[name] = [solveTime];
                    } else {
                        studentMatrix[name].push(solveTime);
                    }
                }

            });
            if (solveTimesForQuestion.length > 0) {
                questionTitles.push(Questions.findOne(questionId).title);
                boxplotMatrix.push(getBoxValues(solveTimesForQuestion));
            }
        });

        //some data transformation to suit highcharts
        studentMatrix = _.map(studentMatrix, function (arr, key) {
            return {
                name: key,
                data: arr
            }
        });
        return {
            boxplot: boxplotMatrix,
            questionTitles: questionTitles,
            lines: studentMatrix
        };
    }
});


function getBoxValues(data) {
    var boxValues = [];
    boxValues.push(Math.round(Math.min.apply(Math,data) * 10) / 10);    //round to 1dp
    boxValues.push(Math.round(getPercentile(data, 25) * 10) / 10);
    boxValues.push(Math.round(getPercentile(data, 50) * 10) / 10);
    boxValues.push(Math.round(getPercentile(data, 75) * 10) / 10);
    boxValues.push(Math.round(Math.max.apply(Math,data) * 10) / 10);
    return boxValues;
}
//get any percentile from an array
function getPercentile(data, percentile) {
    data.sort(numSort);
    var index = (percentile/100) * data.length;
    var result;
    if (Math.floor(index) == index) {
        result = (data[(index-1)] + data[index])/2;
    }
    else {
        result = data[Math.floor(index)];
    }
    return result;
}
//get the mean of an array of numbers
function mean(data) {
    var len = data.length;
    var sum = 0;
    for(var i = 0; i < len; i++) {
        sum += parseFloat(data[i]);
    }
    return (sum / len);
}
//because .sort() doesn't sort numbers correctly
function numSort(a,b) {
    return a - b;
}