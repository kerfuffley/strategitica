import * as Utils from './modules/utils.js';
import { User } from './modules/user.js';
import * as Task from './modules/task.js';

$('#modal-login').modal('show');

let strategiticaClient = '88aa06bb-ec69-43d8-b58a-e6df4aa608ac-Strategitica';

let ID = Utils.getUrlParameter('id');
let token = '';

if (ID != '') {
    $('#user-id').val(ID);
}

let user = null;

$('#strategitica-login').submit(function(event){
    event.preventDefault();

    ID = $('#user-id').val();
    token = $('#api-token').val();

    loadAll(false);

    $('#modal-login').modal('hide');
});

/**
 * Get the user's data and put their info into the page.
 */
function loadAll(showMessage) {
    user = new User(ID, token, strategiticaClient);
    user.create();

    loadUserStats();
    loadCalendar();

    if (showMessage) {
        Utils.updateToast('success', 'Data refreshed', 'Thanks for waiting!');
    }
}

/**
 * Updates the DOM with the user's current tavern status.
 */
function showTavernStatus() {
    let tavernStatusHtml = '';
    let tavernChangeHtml = '';

    if (user.isSleeping === true) {
        tavernStatusHtml = '<div class="bg-warning text-body text-center py-1"><small class="text-center">You are resting in the Tavern. | <a class="text-dark" href="#" id="strategitica-tavern-change2">Leave the tavern</a></small></div>';
        tavernChangeHtml = '<i class="fas fa-door-open"></i> Leave the tavern';
    }
    if (user.isSleeping === false) {
        tavernChangeHtml = '<i class="fas fa-bed"></i> Rest at the tavern';
    }

    $('#strategitica-tavern-status').html(tavernStatusHtml);
    $('#strategitica-tavern-change1').html(tavernChangeHtml);

    if (user.isSleeping === true) {
        $('#strategitica-tavern-change2').on('click', function() {
            user.changeTavernStatus();
            showTavernStatus();
        });
    }

    updateHeaderSpacing();
}

/**
 * Gets user info via the Habitica API and updates the DOM with said info. Also
 * calls {@link showTavernStatus}.
 */
function loadUserStats() {
    let output = '<div class="row mx-n1">' +
        '<div class="col px-1"><h1 class="h6">' + user.displayName + ' <small class="text-muted"><span class="pr-2">@' + user.name + '</span> <span class="pr-2 text-nowrap">Level ' + user.level + ' ' + user.class + '</span></small></h1></div>' +
        '</div>' +
        '<div class="row mx-n1">' +
        '<div class="col px-1"><div class="progress" data-toggle="tooltip" title="Health"><div class="progress-bar bg-habitica-health" role="progressbar" style="width: ' + ((user.hp / user.hpMax) * 100) + '%;" aria-valuenow="' + user.hp + '" aria-valuemin="0" aria-valuemax="' + user.hpMax + '">' + (user.hp % 1 === 0 ? user.hp : user.hp.toFixed(1)) + ' / ' + user.hpMax + '</div></div></div>' +
        '<div class="col px-1"><div class="progress" data-toggle="tooltip" title="Experience"><div class="progress-bar bg-habitica-experience" role="progressbar" style="width: ' + ((user.exp / user.expToNextLevel) * 100) + '%;" aria-valuenow="' + user.exp + '" aria-valuemin="0" aria-valuemax="' + user.expToNextLevel + '">' + (user.exp % 1 === 0 ? user.exp : user.exp.toFixed(1)) + ' / ' + user.expToNextLevel + '</div></div></div>' +
        '<div class="col px-1"><div class="progress" data-toggle="tooltip" title="Mana"><div class="progress-bar bg-habitica-mana" role="progressbar" style="width: ' + ((user.mp / user.mpMax) * 100) + '%;" aria-valuenow="' + user.mp + '" aria-valuemin="0" aria-valuemax="' + user.mpMax + '">' + (user.mp % 1 === 0 ? user.mp : user.mp.toFixed(1)) + ' / ' + user.mpMax + '</div></div></div>' +
        '</div>';

    $('#strategitica-stats').html(output);
    showTavernStatus();
}

/**
 * Uses the Habitica API to complete a task. Must be called from a button (or
 * probably any interactive node really) with data-taskid="[the task ID]" and
 * data-tasktitle="[the task title]".
 * 
 * @param {Object} button - The button that called this function
 * @see {@link https://habitica.com/apidoc/#api-Task-ScoreTask|Task - Score a task}
 */
function completeTask(button) {
    var taskId = button.data('taskid');
    var taskTitle = button.data('tasktitle');

    try {
        $.ajax({
            url: 'https://habitica.com/api/v3/tasks/' + taskId + '/score/up',
            type: 'POST',
            dataType: 'json',
            contentType: 'application/json',
            cache: false,
            beforeSend: function (xhr) {
                xhr.setRequestHeader('x-client', strategiticaClient);
                xhr.setRequestHeader('x-api-user', ID);
                xhr.setRequestHeader('x-api-key', token);
            }
        })
        .done(function (data) {              
            let result = data.data;

            let message = 'Task completed!';

            if ('_tmp' in result) {
                if ('drop' in result._tmp) {
                    if ('dialog' in result._tmp.drop) {
                        message += '<br>' + result._tmp.drop.dialog;
                    }
                }
            }

            $('#modal-task .btn-task-complete-js').html('Completed! Updating page...');
            loadAll(false);
            $('#modal-task').modal('hide');

            Utils.updateToast('success', taskTitle, message);
        })
        .fail(function (jqXHR, textStatus, errorThrown) {
            let message = 'Couldn\'t complete ' + taskTitle + ': <br>' + jqXHR.status + ' Error';

            if ('responseJSON' in jqXHR) {
                if ('message' in jqXHR.responseJSON) {
                    message += ' - ' + jqXHR.responseJSON.message;
                }
            }

            Utils.updateToast('error', 'Error', message);
        });
    }
    catch (error) {
        $('#modal-task').modal('hide');
        Utils.updateToast('error', 'Error', 'Couldn\'t complete ' + taskTitle + ': <br>' + error.responseText);
    }
}

/**
 * Hides the non-editing parts of the task modal and shows the editing parts.
 */
function editTask() {
    $('#modal-task .btn-group-task1-js').addClass('d-none');
    $('#modal-task .btn-group-task2-js').removeClass('d-none');

    $('#modal-task .task-param-editable-js').removeClass('d-none');
    $('#modal-task .task-param-static-js').addClass('d-none');
}

/**
 * Basically, the opposite of {@link editTask}.
 */
function cancelEditTask() {
    $('#modal-task .btn-group-task1-js').removeClass('d-none');
    $('#modal-task .btn-group-task2-js').addClass('d-none');

    $('#modal-task .task-param-editable-js').addClass('d-none');
    $('#modal-task .task-param-static-js').removeClass('d-none');
}

/**
 * Uses the Habitica API to update a task. Must be called from a button (or
 * probably any interactive node really) with data-taskid="[the task ID]".
 * 
 * @param {Object} button - The button that called this function
 * @see {@link https://habitica.com/apidoc/#api-Task-UpdateTask|Task - Update a task}
 */
function saveTask(button) {
    var taskId = button.data('taskid');
    var isNewTask = button.data('new');
    var taskText = $('#task-' + taskId + '-text-modal').val();

    if (taskText.trim() === '') {
        alert('The task title is required.');
    }
    else {
        var taskType = $('#task-' + taskId + '-type-modal').val();
        var taskNotes = $('#task-' + taskId + '-notes-modal').val();
        var taskDifficulty = parseFloat($('#task-' + taskId + '-difficulty-modal').val());

        var taskParameters = {
            'text': taskText, // task title; required
            'notes': taskNotes,
            //'date': '', // only valid for todo's; string
            'priority': taskDifficulty,
            //'reminders': '', // will add this later
            //'streak: '', // will add this later
        };

        if (isNewTask) {
            taskParameters['type'] = taskType;
        }
    
        if (taskType === 'daily') {
            var taskStartDate = new Date($('#task-' + taskId + '-startdate-modal').val() + 'T00:00:00');
            taskParameters['startDate'] = taskStartDate;
    
            var taskFrequency = $('#task-' + taskId + '-frequency-modal').val();
            taskParameters['frequency'] = taskFrequency;
    
            var taskEveryX = Math.floor($('#task-' + taskId + '-everyx-modal').val());
            taskParameters['everyX'] = taskEveryX;
    
            var isMonthlyDayOfMonth = taskFrequency === 'monthly' && $('#task-' + taskId + '-dayofmonth-modal').is(':checked') ? true : false;
            var isMonthlyWeekOfMonth = taskFrequency === 'monthly' && $('#task-' + taskId + '-weekofmonth-modal').is(':checked') ? true : false;
    
            var taskRepeat = {};
    
            if (isMonthlyDayOfMonth || isMonthlyWeekOfMonth) {
                taskRepeat = {
                    'm': taskStartDate.getDay() === 1 ? true : false,
                    't': taskStartDate.getDay() === 2 ? true : false,
                    'w': taskStartDate.getDay() === 3 ? true : false,
                    'th': taskStartDate.getDay() === 4 ? true : false,
                    'f': taskStartDate.getDay() === 5 ? true : false,
                    's': taskStartDate.getDay() === 6 ? true : false,
                    'su': taskStartDate.getDay() === 0 ? true : false
                };
            }
            else {
                taskRepeat = {
                    'm': $('#task-' + taskId + '-repeat-m-modal').is(':checked') ? true : false,
                    't': $('#task-' + taskId + '-repeat-t-modal').is(':checked') ? true : false,
                    'w': $('#task-' + taskId + '-repeat-w-modal').is(':checked') ? true : false,
                    'th': $('#task-' + taskId + '-repeat-th-modal').is(':checked') ? true : false,
                    'f': $('#task-' + taskId + '-repeat-f-modal').is(':checked') ? true : false,
                    's': $('#task-' + taskId + '-repeat-s-modal').is(':checked') ? true : false,
                    'su': $('#task-' + taskId + '-repeat-su-modal').is(':checked') ? true : false
                };
            }
    
            taskParameters['repeat'] = taskRepeat;
    
    
            var taskDaysOfMonth = [];
    
            if (isMonthlyDayOfMonth) {
                taskDaysOfMonth[0] = taskStartDate.getDate();
            }
    
            taskParameters['daysOfMonth'] = taskDaysOfMonth;
    
    
            var taskWeeksOfMonth = [];
    
            if (isMonthlyWeekOfMonth) {
                if (taskStartDate.getDate() <= 7) {
                    taskWeeksOfMonth[0] = 0;
                }
                else if (taskStartDate.getDate() <= 14) {
                    taskWeeksOfMonth[0] = 1;
                }
                else if (taskStartDate.getDate() <= 21) {
                    taskWeeksOfMonth[0] = 2;
                }
                else if (taskStartDate.getDate() <= 28) {
                    taskWeeksOfMonth[0] = 3;
                }
                else if (taskStartDate.getDate() <= 31) {
                    taskWeeksOfMonth[0] = 4;
                }
            }
            
            taskParameters['weeksOfMonth'] = taskWeeksOfMonth;
        }

        var taskTags = [];

        $('#modal-task input[type="checkbox"].task-tag-js:checked').each(function() {
            taskTags.push($(this).val());
        });

        taskParameters['tags'] = taskTags;
    
        try {
            $.ajax({
                url: 'https://habitica.com/api/v3/tasks/' + (isNewTask ? 'user' : taskId),
                type: isNewTask ? 'POST' : 'PUT',
                data: JSON.stringify(taskParameters),
                dataType: 'json',
                contentType: 'application/json',
                cache: false,
                beforeSend: function (xhr) {
                    xhr.setRequestHeader('x-client', strategiticaClient);
                    xhr.setRequestHeader('x-api-user', ID);
                    xhr.setRequestHeader('x-api-key', token);
                }
            })
            .done(function (data) {
                let message = 'Task successfully saved.';
    
                $('#modal-task .btn-task-edit-done-js').html('Saved! Updating page...');
                loadAll(false);
                $('#modal-task').modal('hide');
    
                Utils.updateToast('success', taskText, message);
            })
            .fail(function (jqXHR, textStatus, errorThrown) {
                let message = 'Couldn\'t save ' + taskText + ': <br>' + jqXHR.status + ' Error';
    
                if ('responseJSON' in jqXHR) {
                    if ('message' in jqXHR.responseJSON) {
                        message += ' - ' + jqXHR.responseJSON.message;
                    }
                }
    
                Utils.updateToast('error', 'Error', message);
            });
        }
        catch (error) {
            $('#modal-task').modal('hide');
            Utils.updateToast('error', 'Error', 'Couldn\'t save ' + taskText + ': <br>' + error.responseText);
        }
    }
}

/**
 * Uses the Habitica API to delete a task. Must be called from a button (or
 * probably any interactive node really) with data-taskid="[the task ID]" and
 * data-tasktitle="[the task title]".
 * 
 * @param {Object} button - The button that called this function
 * @see {@link https://habitica.com/apidoc/#api-Task-DeleteTask|Task - Delete a task}
 */
function deleteTask(button) {
    if (confirm('Are you sure you want to delete this task?')) {
        var taskId = button.data('taskid');
        var taskTitle = button.data('tasktitle');

        try {
            $.ajax({
                url: 'https://habitica.com/api/v3/tasks/' + taskId,
                method: 'DELETE',
                dataType: 'json',
                contentType: 'application/json',
                beforeSend: function (xhr) {
                    xhr.setRequestHeader('x-client', strategiticaClient);
                    xhr.setRequestHeader('x-api-user', ID);
                    xhr.setRequestHeader('x-api-key', token);
                }
            })
            .done(function (data) {  
                let message = 'Task deleted successfully.';
    
                $('#modal-task .btn-task-delete-js').html('Deleted. Updating page...');
                loadAll(false);
                $('#modal-task').modal('hide');

                Utils.updateToast('success', taskTitle, message);
            })
            .fail(function (jqXHR, textStatus, errorThrown) {
                let message = 'Couldn\'t delete task: <br>' + jqXHR.status + ' Error';
    
                if ('responseJSON' in jqXHR) {
                    if ('message' in jqXHR.responseJSON) {
                        message += ' - ' + jqXHR.responseJSON.message;
                    }
                }
    
                $('#modal-task').modal('hide');
                Utils.updateToast('error', taskTitle, message);
            });
        }
        catch (error) {
            $('#modal-task').modal('hide');
            Utils.updateToast('error', taskTitle, 'Couldn\'t delete task: <br>' + error.responseText);
        }
    }
}

/**
 * Uses the Habitica API to check or uncheck a checklist item. Must be called
 * from a checkbox (or probably any interactive node really) with
 * data-taskid="[the task ID]", data-itemtitle="[the checklist item title]" and
 * data-itemid="[the checklist item ID]".
 * 
 * @param {Object} checkbox - The checkbox that called this function
 * @see {@link https://habitica.com/apidoc/#api-Task-ScoreChecklistItem|Task - Score a checklist item}
 */
function scoreChecklistItem(checkbox) {
    var taskId = checkbox.data('taskid');
    var itemTitle = checkbox.data('itemtitle');
    var itemId = checkbox.data('itemid');

    try {
        $.ajax({
            url: 'https://habitica.com/api/v3/tasks/' + taskId + '/checklist/' + itemId + '/score',
            method: 'POST',
            dataType: 'json',
            contentType: 'application/json',
            beforeSend: function (xhr) {
                xhr.setRequestHeader('x-client', strategiticaClient);
                xhr.setRequestHeader('x-api-user', ID);
                xhr.setRequestHeader('x-api-key', token);
            }
        })
        .done(function (data) {      
            loadAll(false);
        })
        .fail(function (jqXHR, textStatus, errorThrown) {
            let message = 'Couldn\'t score checklist item: <br>' + jqXHR.status + ' Error';

            if ('responseJSON' in jqXHR) {
                if ('message' in jqXHR.responseJSON) {
                    message += ' - ' + jqXHR.responseJSON.message;
                }
            }

            Utils.updateToast('error', itemTitle, message);
        });
    }
    catch (error) {
        $('#modal-task').modal('hide');
        Utils.updateToast('error', itemTitle, 'Couldn\'t score checklist item: <br>' + error.responseText);
    }
}

/**
 * This basically gets the user's task list via the Habitica API and sorts it
 * so it can be put in calendar format. The more complex version is this:
 * 1.   Provide some basic info, including but not limited to what the name of
 *      each day of the week is, and how many days into the future this
 *      calendar should be limited to.
 * 2.   Create an object, which will contain a bunch of arrays. Essentially,
 *      we're creating a list of dates that have tasks due, and each of those
 *      dates will be tied to that date's list of tasks. Also, each item in
 *      that list of tasks will be tied to a task ID. So, the index of the
 *      first array "tier" will represent a date, and the index of the second
 *      array "tier" will be a task ID. It's important for the task ID to be
 *      there because we'll use it later on to ensure a task doesn't appear
 *      twice in the same day (don't ask me how or why this happens, I just
 *      know that it does).
 * 3.   Go through each task and determine if it should be in the calendar. It
 *      shouldn't be included if its due date is too far in the future, or if
 *      its due date is today but it's been completed. If its due date is in
 *      the past, we can include it--we'll just consider its due date to be
 *      today so that those tasks can still be completed, albeit a bit late. If
 *      the task should be included, add it to the array for its due date. This
 *      is done for each task's future due dates as well.
 * 4.   Start coming up with the calendar HTML. Regardless of what day it is
 *      today, we need to start off the calendar with the current month,
 *      including past days up to yesterday, because a calendar that begins
 *      mid-month looks weird. Those days need to be styled to look different
 *      so it's clear to the user that they're days in the past.
 * 5.   Go through each date from today onward and, if the current date exists
 *      in the list of dates with tasks due, add HTML for each task to a
 *      container for that day. We'll keep doing this until we've reached the
 *      day limit for the calendar. Each task will have some data-* attributes
 *      (see {@link Task.badgeHtml}) we'll use later to associate the task with
 *      some tooltip and modal text. As we're looping through the days and
 *      tasks, we'll also...
 *      a.  Check if each day is at the beginning or end of the week or month
 *          so that things can get aligned properly, and so that month and week
 *          labels can get added at the start of each new month.
 *      b.  Start adding up the difficulty of each task to come up with a
 *          difficulty rating for the day.
 *      c.  Determine if each task has a tag for a certain time of day:
 *          morning, afternoon and evening. If a task has exactly one of those
 *          tags, we'll put it into an array for that time of day; if it has
 *          none of those tags or two or more of those tags, we'll put it in a
 *          "whenever" array. This way, we can sort tasks by time of day.
 *      d.  Generate some tooltip and modal HTML associated with each task (see
 *          {@link Task.tooltipHtml} and {@link Task.modalHtml}) and add that
 *          HTML string to two respective arrays. We'll be dealing with that
 *          info shortly.
 * 6.   Once we've looped through all the days, we'll simply loop through
 *      everything in the tooltip and modal HTML arrays and append each chunk
 *      of HTML to a node with a unique ID that includes the task ID. This is
 *      how the task in the calendar and its tooltip and modal will be
 *      associated with one another.
 * 7.   Finally, the calendar HTML is added to the DOM, and each of the tooltip
 *      and modal nodes get appended to a hidden node in the DOM as well. Now
 *      that the DOM knows about the calendar, we need to make sure the task
 *      badges in it are interactive.
 * 
 * @todo Currently, future due dates are limited to whichever future due dates
 * the Habitica API provides, which seems to be the next ~6-7 due dates. I'm
 * hoping I can come up with something to get due dates beyond that because,
 * for tasks that occur very often, it sucks to only be able to accurately see
 * a week or so into the future.
 */
function loadCalendar() {
    let tasks = user.tasks;
    let output = '';

    let today = new Date(); // [1]
    let thisMonth = today.getMonth(); // [1]
    let firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1); // [1]
    let firstOfMonthDayOfWeek = firstOfMonth.getDay(); // [1]

    let calendarDaysLimit = 186; // [1]
    let today2 = new Date();
    let calendarLastDay = new Date(today2.setDate(today2.getDate() + calendarDaysLimit)); // [1]
    let weekDayNames = [ // [1]
        ['Sunday', 'Sun'],
        ['Monday', 'Mon'],
        ['Tuesday', 'Tue'],
        ['Wednesday', 'Wed'],
        ['Thursday', 'Thu'],
        ['Friday', 'Fri'],
        ['Saturday', 'Sat']
    ];
    let datesWithTasksDue = {}; // [2]

    for (var i = 0; i < tasks.length; i++) { // [3]
        var task = tasks[i];

        if (task.startDate != null || task.nextDue != null) {
            if (task.startDate != null) {
                var startDate = new Date(task.startDate);

                if (startDate < today) { // [3]
                    if (task.isDue != null && task.isDue === true) {
                        startDate = today; // [3]
                    }
                    else {
                        startDate = null;
                    }
                }

                if (startDate != null) {
                    var shouldAddTask = true;

                    if (startDate > calendarLastDay) { // [3]
                        shouldAddTask = false;
                    }

                    if (startDate.setHours(0, 0, 0, 0) === today.setHours(0, 0, 0, 0) && task.completed === true) { // [3]
                        shouldAddTask = false;
                    }

                    if (shouldAddTask) {
                        var startDateKey = Utils.getDateKey(startDate); // [2]

                        if (!(startDateKey in datesWithTasksDue)) {
                            datesWithTasksDue[startDateKey] = []; // [2]
                        }

                        if (!(task.id in datesWithTasksDue[startDateKey])) {
                            datesWithTasksDue[startDateKey][task.id] = task; // [2], [3]
                        }
                    }
                }
            }

            if (task.nextDue != null && task.nextDue.length > 0) {
                if (!Task.isOneTimeDaily(task, user.tags)) {
                    task.nextDue.forEach(function (value) {
                        var startDate = new Date(task.startDate);
                        var currentDay = new Date(value);
                        var currentDayKey = Utils.getDateKey(currentDay); // [2]

                        var shouldAddTask = true;

                        if (currentDay > calendarLastDay) { // [3]
                            shouldAddTask = false;
                        }

                        if (shouldAddTask) {
                            if (!(currentDayKey in datesWithTasksDue)) {
                                datesWithTasksDue[currentDayKey] = []; // [2]
                            }

                            if (!(task.id in datesWithTasksDue[currentDayKey])) {
                                datesWithTasksDue[currentDayKey][task.id] = task; // [2], [3]
                            }
                        }
                    });
                }
            }
        }
    }

    var weekLabels = '<div class="calendar-week">'; // [4]

    weekDayNames.forEach(function (value) { // [1], [4]
        weekLabels += '<div class="calendar-label-week">';
        weekLabels += '<span class="d-none d-lg-inline">' + value[0] + '</span>';
        weekLabels += '<span class="d-none d-md-block d-lg-none">' + value[1] + '</span>';
        weekLabels += '</div>';
    });

    weekLabels += '</div>';

    output += '<div class="calendar-label-month">' + Utils.monthNames[today.getMonth()][0] + ' ' + today.getFullYear() + '</div><div class="clearfix"></div>' + weekLabels; // [4]

    for (var i = 1; i < today.getDate(); i++) { // [4]
        var thisDate = new Date(today.getFullYear(), today.getMonth(), i);

        if (i === 1 || thisDate.getDay() === 0) { // if this day is the first of the month OR if this day is Sunday
            output += '<div class="calendar-week">';
        }

        output += '<div class="calendar-day calendar-day-past' + (i === 1 ? ' calendar-day-offset' + firstOfMonthDayOfWeek : '') + ' d-none d-md-block"><div class="p-1"><span class="calendar-label-day">' + i + '</span></div></div>'; // [4]

        if (thisDate.getDay() === 6) { // if this day is Saturday
            output += '</div><!-- end .calendar-week -->';
        }
    }

    var dayCounter = 0; // [5]
    var tasksTooltipText = {}; // [5d]
    var tasksModalText = {}; // [5d]

    for (var i = today.getDate(); i <= calendarDaysLimit; i++) { // [5]
        var currentDay = new Date(today);
        currentDay.setDate(currentDay.getDate() + dayCounter);

        if (currentDay.getMonth() != thisMonth) { // [5a]
            output += '<div class="calendar-label-month">' + Utils.monthNames[currentDay.getMonth()][0] + ' ' + currentDay.getFullYear() + '</div>' + weekLabels; // [5a]

            thisMonth = currentDay.getMonth(); // [5a]
        }

        var currentDayKey = Utils.getDateKey(currentDay); // [2]
        var dayTasks = '';
        var difficultyRating = 0; // [5b]
        var dayDuration = 0;
        var dayDurationAsterisk = false;

        if (currentDayKey in datesWithTasksDue) { // [2], [5]
            var morningTasks = []; // [5c]
            var afternoonTasks = []; // [5c]
            var eveningTasks = []; // [5c]
            var otherTasks = []; // [5c]

            Object.keys(datesWithTasksDue[currentDayKey]).forEach(function (key) { // [2], [5]
                var task = datesWithTasksDue[currentDayKey][key]; // [2]
                var timeOfDayTags = 0; // [5c]
                var hasMorningTag = Task.hasTimeOfDayTag(task, 'morning', user.tags); // [5c]
                var hasAfternoonTag = Task.hasTimeOfDayTag(task, 'afternoon', user.tags); // [5c]
                var hasEveningTag = Task.hasTimeOfDayTag(task, 'evening', user.tags); // [5c]

                if (typeof task.priority === 'number') {
                    difficultyRating += task.priority; // [5b]
                }

                if (hasMorningTag) {
                    timeOfDayTags++; // [5c]
                }
                if (hasAfternoonTag) {
                    timeOfDayTags++; // [5c]
                }
                if (hasEveningTag) {
                    timeOfDayTags++; // [5c]
                }

                if (timeOfDayTags === 1) { // [5c]
                    if (hasMorningTag) {
                        morningTasks.push(task); // [5c]
                    }
                    if (hasAfternoonTag) {
                        afternoonTasks.push(task); // [5c]
                    }
                    if (hasEveningTag) {
                        eveningTasks.push(task); // [5c]
                    }
                }
                else {
                    otherTasks.push(task); // [5c]
                }
            });

            if (morningTasks.length > 0) { // [5c]
                var badgesHtml = '';
                var timeOfDayDuration = 0;
                var timeOfDayDurationAsterisk = false;

                morningTasks.forEach(function (value) {
                    var taskDuration = Task.duration(value, user.tags);
                    dayDuration += taskDuration;
                    timeOfDayDuration += taskDuration;
                    if (taskDuration === 0) {
                        dayDurationAsterisk = true;
                        timeOfDayDurationAsterisk = true;
                    }

                    var tooltipHtml = Task.tooltipHtml(value); // [5d]
                    var modalHtml = Task.modalHtml(value, user.tags); // [5d]
                    badgesHtml += Task.badgeHtml(value, user.tags); // [5]

                    if (!(value.id in tasksTooltipText)) {
                        tasksTooltipText[value.id] = tooltipHtml; // [5d]
                    }

                    if (!(value.id in tasksModalText)) {
                        tasksModalText[value.id] = modalHtml; // [5d]
                    }
                });

                dayTasks += '<div><small>Morning:</small>' + (timeOfDayDuration > 0 ? ' <span class="badge badge-pill badge-light float-right" title="Morning tasks duration' + (timeOfDayDurationAsterisk ? ' (may be inaccurate since the duration for one or more tasks couldn\'t be determined)' : '') + '">' + Utils.formatDuration(timeOfDayDuration) + (timeOfDayDurationAsterisk ? '*' : '') + '</span>' : '') + '</div>' + badgesHtml;
            }

            if (afternoonTasks.length > 0) { // [5c]
                var badgesHtml = '';
                var timeOfDayDuration = 0;
                var timeOfDayDurationAsterisk = false;

                afternoonTasks.forEach(function (value) {
                    var taskDuration = Task.duration(value, user.tags);
                    dayDuration += taskDuration;
                    timeOfDayDuration += taskDuration;
                    if (taskDuration === 0) {
                        dayDurationAsterisk = true;
                        timeOfDayDurationAsterisk = true;
                    }

                    var tooltipHtml = Task.tooltipHtml(value); // [5d]
                    var modalHtml = Task.modalHtml(value, user.tags); // [5d]
                    badgesHtml += Task.badgeHtml(value, user.tags); // [5]

                    if (!(value.id in tasksTooltipText)) {
                        tasksTooltipText[value.id] = tooltipHtml; // [5d]
                    }

                    if (!(value.id in tasksModalText)) {
                        tasksModalText[value.id] = modalHtml; // [5d]
                    }
                });

                dayTasks += '<div><small>Afternoon:</small>' + (timeOfDayDuration > 0 ? ' <span class="badge badge-pill badge-light float-right" title="Afternoon tasks duration' + (timeOfDayDurationAsterisk ? ' (may be inaccurate since the duration for one or more tasks couldn\'t be determined)' : '') + '">' + Utils.formatDuration(timeOfDayDuration) + (timeOfDayDurationAsterisk ? '*' : '') + '</span>' : '') + '</div>' + badgesHtml;
            }

            if (eveningTasks.length > 0) { // [5c]
                var badgesHtml = '';
                var timeOfDayDuration = 0;
                var timeOfDayDurationAsterisk = false;

                eveningTasks.forEach(function (value) {
                    var taskDuration = Task.duration(value, user.tags);
                    dayDuration += taskDuration;
                    timeOfDayDuration += taskDuration;
                    if (taskDuration === 0) {
                        dayDurationAsterisk = true;
                        timeOfDayDurationAsterisk = true;
                    }

                    var tooltipHtml = Task.tooltipHtml(value); // [5d]
                    var modalHtml = Task.modalHtml(value, user.tags); // [5d]
                    badgesHtml += Task.badgeHtml(value, user.tags); // [5]

                    if (!(value.id in tasksTooltipText)) {
                        tasksTooltipText[value.id] = tooltipHtml; // [5d]
                    }

                    if (!(value.id in tasksModalText)) {
                        tasksModalText[value.id] = modalHtml; // [5d]
                    }
                });

                dayTasks += '<div><small>Evening:</small>' + (timeOfDayDuration > 0 ? ' <span class="badge badge-pill badge-light float-right" title="Evening tasks duration' + (timeOfDayDurationAsterisk ? ' (may be inaccurate since the duration for one or more tasks couldn\'t be determined)' : '') + '">' + Utils.formatDuration(timeOfDayDuration) + (timeOfDayDurationAsterisk ? '*' : '') + '</span>' : '') + '</div>' + badgesHtml;
            }

            if (otherTasks.length > 0) { // [5c]
                var badgesHtml = '';
                var timeOfDayDuration = 0;
                var timeOfDayDurationAsterisk = false;

                otherTasks.forEach(function (value) {
                    var taskDuration = Task.duration(value, user.tags);
                    dayDuration += taskDuration;
                    timeOfDayDuration += taskDuration;
                    if (taskDuration === 0) {
                        dayDurationAsterisk = true;
                        timeOfDayDurationAsterisk = true;
                    }

                    var tooltipHtml = Task.tooltipHtml(value); // [5d]
                    var modalHtml = Task.modalHtml(value, user.tags); // [5d]
                    badgesHtml += Task.badgeHtml(value, user.tags); // [5]

                    if (!(value.id in tasksTooltipText)) {
                        tasksTooltipText[value.id] = tooltipHtml; // [5d]
                    }

                    if (!(value.id in tasksModalText)) {
                        tasksModalText[value.id] = modalHtml; // [5d]
                    }
                });

                if (morningTasks.length > 0 || afternoonTasks.length > 0 || eveningTasks.length > 0) {
                    dayTasks += '<div><small>Whenever:</small>' + (timeOfDayDuration > 0 ? ' <span class="badge badge-pill badge-light float-right" title="Other tasks duration' + (timeOfDayDurationAsterisk ? ' (may be inaccurate since the duration for one or more tasks couldn\'t be determined)' : '') + '">' + Utils.formatDuration(timeOfDayDuration) + (timeOfDayDurationAsterisk ? '*' : '') + '</span>' : '') + '</div>';
                }

                dayTasks += badgesHtml;
            }
        }

        if (currentDay.getDay() === 0 || currentDay.getDate() === 1) { // [5a]
            output += '<div class="calendar-week">';
        }

        output += '<div class="calendar-day' + (dayCounter % 2 === 0 ? '' : ' calendar-day-alternate') + (currentDay.getDay() === 0 || currentDay.getDay() === 6 ? ' calendar-day-weekend' : '') + (currentDay.getDate() === 1 ? ' calendar-day-offset' + currentDay.getDay() : '') + '">' + 
        '<div class="p-1">' + 
        '<span class="calendar-label-day">' + 
        '<span class="d-md-none">' + weekDayNames[currentDay.getDay()][1] + ', ' + Utils.monthNames[thisMonth][1] + '</span> ' + 
        currentDay.getDate() +  
        //' <span class="badge badge-pill badge-light float-right" title="Difficulty rating"><i class="fas fa-star" aria-hidden="true"></i>' + (difficultyRating % 1 === 0 ? difficultyRating : difficultyRating.toFixed(1)) + '</span>' + 
        ' <span class="badge badge-pill badge-light float-right" title="Total tasks duration' + (dayDurationAsterisk ? ' (may be inaccurate since the duration for one or more tasks couldn\'t be determined)' : '') + '">' + Utils.formatDuration(dayDuration) + (dayDurationAsterisk ? '*' : '') + '</span>' + 
        '</span>' + 
        dayTasks + 
        '</div>' + 
        '</div>'; // [5]

        if (currentDay.getDay() === 6 || currentDay.getDate() === Utils.getLastDayOfMonth(currentDay.getFullYear(), currentDay.getMonth()) || dayCounter === calendarDaysLimit) { // [5a]
            output += '</div><!-- end .calendar-week -->';
        }

        dayCounter = dayCounter + 1; // [5]
    }

    let interactiveDescriptions = ''; // [6]

    Object.keys(tasksTooltipText).forEach(function (key) {
        interactiveDescriptions += '<div id="task-' + key + '-tooltip">' + tasksTooltipText[key] + '</div>'; // [5d], [6]
    });

    Object.keys(tasksModalText).forEach(function (key) {
        interactiveDescriptions += '<div id="task-' + key + '-modal">' + tasksModalText[key] + '</div>'; // [5d], [6]
    });

    var newTask = {
        id: 'new',
        text: 'New Task',
        type: 'daily',
        priority: 1,
        frequency: 'weekly',
        repeat: {
            'su': true,
            'm': true,
            't': true,
            'w': true,
            'th': true,
            'f': true,
            's': true
        },
        everyX: 1,
        tags: []
    };

    interactiveDescriptions += '<div id="task-new-modal">' + Task.modalHtml(newTask, user.tags) + '</div>';

    $('#strategitica-calendar').html(output); // [5], [7]
    $('#strategitica-descriptions').html(interactiveDescriptions); // [5d], [6], [7]

    $('.badge-task-js').on('click', function (e) { // [7]
        var taskId = $(this).data('taskid');
        var taskDescription = $('#task-' + taskId + '-modal').html();
        $('#modal-task').find('.modal-content').html(taskDescription);
        $('#modal-task').modal('show');
    });
};

function updateHeaderSpacing() {
    let headerHeight = $('.header-js').outerHeight(true);

    $('body').css('padding-top', headerHeight);
    $('.toasts-js').css('top', headerHeight);
}

$('body').popover({
    selector: '.badge-task-js',
    html: true, 
    trigger: 'hover',
    placement: 'auto',
    content: function() { 
        return $('#task-' + $(this).data('taskid') + '-tooltip').html()
    }
});

$('body').tooltip({
    selector: '[data-toggle="tooltip"]'
});

$('#strategitica-add-daily').on('click', function (e) {
    var taskId = 'new';
    var taskDescription = $('#task-' + taskId + '-modal').html();
    $('#modal-task').find('.modal-content').html(taskDescription);
    editTask();
    $('#modal-task').modal('show');
});

$('#strategitica-refresh').on('click', function() {
    loadAll(true);
});

$('#strategitica-tavern-change1').on('click', function() {
    user.changeTavernStatus();
    showTavernStatus();
});


$('#modal-task').on('show.bs.modal', function (e) {
    // Let's avoid duplicate IDs, please...
    $(this).find('[id]').each(function() {
        var itemId = $(this).attr('id');
        $(this).attr('id', itemId + '-modal');
    });

    // Gotta change the labels to match the new IDs too
    $(this).find('[for]').each(function() {
        var itemFor = $(this).attr('for');
        $(this).attr('for', itemFor + '-modal');
    });

    // Gotta change the aria-labelledby to match as well
    $(this).attr('aria-labelledby', $(this).find('.modal-header .modal-title').first().attr('id'));

    // On non-touch devices, popovers appear when hovering over a task, and the
    // modal appears when clicking a task. On touch devices, both appear when
    // touching a task. We only want the modal to appear on touch devices, but
    // detecting touch isn't foolproof. So instead, we just want to make sure
    // all popovers are closed when the modal opens. So...
    $('.badge-task-js').popover('hide');

    // The contents of the modal get added after DOM load, so any handlers we
    // attach to them before they're loaded won't work. So, we're adding them
    // here. Now, I did try adding these handlers right after they get added to
    // the DOM, but I guess that was still too soon. It seems to work once the
    // modal is opened though. Whatever.
    $(this).find('.btn-task-edit-js').on('click', function(e) {
        editTask();
    });

    $(this).find('.btn-task-edit-cancel-js').on('click', function(e) {
        cancelEditTask();
    });

    $(this).find('.btn-task-save-js').on('click', function (e) {
        saveTask($(this));
    });

    $(this).find('.btn-task-delete-js').on('click', function(e) {
        deleteTask($(this));
    });

    $(this).find('.btn-task-complete-js').on('click', function(e) {
        completeTask($(this));
    });
});


$(document).ready(function () {
    updateHeaderSpacing();
});

Utils.onResize(function () {
    updateHeaderSpacing();
});

$(document).on('change', '.task-checklist-item-js', function () {
    scoreChecklistItem($(this));
});

$(document).on('change', '.task-checklist-item-js', function () {
    scoreChecklistItem($(this));
});

$(document).on('change', '#modal-task [name="task-frequency"]', function() {
    var taskRepeatContainer = $('#modal-task .task-param-repeat-js');
    var taskDaysWeeksOfMonthContainer = $('#modal-task .task-param-daysweeksofmonth-js');
    var taskEveryXAddon = $('#modal-task .task-everyx-addon-js');

    if ($(this).val() === 'weekly') {
        taskRepeatContainer.removeClass('d-none');
    }
    else {
        taskRepeatContainer.addClass('d-none');
    }

    if ($(this).val() === 'monthly') {
        taskDaysWeeksOfMonthContainer.removeClass('d-none');

        if ($('#modal-task [name="task-dayofweekmonth"]:checked').length === 0) {
            $('#modal-task [name="task-dayofweekmonth"]').first().prop('checked', true);
        }
    }
    else {
        taskDaysWeeksOfMonthContainer.addClass('d-none');

        $('#modal-task [name="task-dayofweekmonth"]').prop('checked', false);
    }

    taskEveryXAddon.html(Utils.frequencyPlurals[$(this).val()]);
});

$(document).on('change', '#modal-task [name="task-everyx"]', function() {
    var everyXValue = $(this).val();

    if (parseInt(everyXValue) <= 0 || Number.isNaN(parseInt(everyXValue))) {
        $(this).val(1);
    }

    if (everyXValue % 1 != 0) {
        $(this).val(Math.floor(everyXValue));
    }
});