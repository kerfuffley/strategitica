import * as Utils from './modules/utils.js';
import { User } from './modules/user.js';
import { Task } from './modules/task.js';
import * as TaskActions from './modules/taskActions.js';

import $ from 'jquery';
import '../node_modules/bootstrap/dist/js/bootstrap.bundle.min.js';
import md from 'habitica-markdown';

import '@fortawesome/fontawesome-free/css/all.min.css';
import './sass/style.scss';

$('#modal-login').modal('show');

let ID = Utils.getUrlParameter('id');
let token = '';

if (ID != '') {
    $('#user-id').val(ID);
}

let user = null;

$('#strategitica-login').on('submit', function(event) {
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
    user = new User(ID, token);
    user.create();

    loadUserStats();
    loadCalendar();
    loadTavernStatus();

    if (showMessage) {
        Utils.updateToast('success', 'Data refreshed', 'Thanks for waiting!');
    }
}

/**
 * Gets user info via the Habitica API and updates the DOM with said info.
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
 *      know that it can).
 * 3.   Go through each task's list of dates, if they have one, and add it to
 *      the array for each of its dates.
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
 *      c.  Put each task into an array based on which time of day it is.
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
    today.setHours(0, 0, 0, 0);
    let thisMonth = today.getMonth(); // [1]
    let firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1); // [1]
    let firstOfMonthDayOfWeek = firstOfMonth.getDay(); // [1]

    let calendarDaysLimitFromParam = parseInt(Utils.getUrlParameter('days'));
    let calendarDaysLimit = isNaN(calendarDaysLimitFromParam) ? 90 : calendarDaysLimitFromParam; // [1]
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
        var task = new Task(tasks[i], user);
        task.create();

        var taskDates = task.dates(calendarDaysLimit); // [3]

        if (taskDates.length > 0) { // [3]
            for (var j = 0; j < taskDates.length; j++) {
                var date = taskDates[j];
                if (!(date in datesWithTasksDue)) {
                    datesWithTasksDue[date] = []; // [2]
                }

                if (datesWithTasksDue[date].indexOf(task.id) === -1) {
                    datesWithTasksDue[date][task.id] = task; // [2], [3]
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

    for (var i = 0; i <= calendarDaysLimit; i++) { // [5]
        var currentDay = new Date(today);
        currentDay.setDate(currentDay.getDate() + dayCounter);
        currentDay.setHours(0, 0, 0, 0);

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

                if (typeof task.priority === 'number') {
                    difficultyRating += task.priority; // [5b]
                }

                if (task.timeOfDay === 'morning') {
                    morningTasks.push(task); // [5c]
                }
                else if (task.timeOfDay === 'afternoon') {
                    afternoonTasks.push(task); // [5c]
                }
                else if (task.timeOfDay === 'evening') {
                    eveningTasks.push(task); // [5c]
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
                    var taskDuration = value.duration();
                    dayDuration += taskDuration;
                    timeOfDayDuration += taskDuration;
                    if (taskDuration === 0) {
                        dayDurationAsterisk = true;
                        timeOfDayDurationAsterisk = true;
                    }

                    var tooltipHtml = value.tooltipHtml(); // [5d]
                    var modalHtml = value.modalHtml(); // [5d]
                    badgesHtml += value.badgeHtml(); // [5]

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
                    var taskDuration = value.duration();
                    dayDuration += taskDuration;
                    timeOfDayDuration += taskDuration;
                    if (taskDuration === 0) {
                        dayDurationAsterisk = true;
                        timeOfDayDurationAsterisk = true;
                    }

                    var tooltipHtml = value.tooltipHtml(); // [5d]
                    var modalHtml = value.modalHtml(); // [5d]
                    badgesHtml += value.badgeHtml(); // [5]

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
                    var taskDuration = value.duration();
                    dayDuration += taskDuration;
                    timeOfDayDuration += taskDuration;
                    if (taskDuration === 0) {
                        dayDurationAsterisk = true;
                        timeOfDayDurationAsterisk = true;
                    }

                    var tooltipHtml = value.tooltipHtml(); // [5d]
                    var modalHtml = value.modalHtml(); // [5d]
                    badgesHtml += value.badgeHtml(); // [5]

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
                    var taskDuration = value.duration();
                    dayDuration += taskDuration;
                    timeOfDayDuration += taskDuration;
                    if (taskDuration === 0) {
                        dayDurationAsterisk = true;
                        timeOfDayDurationAsterisk = true;
                    }

                    var tooltipHtml = value.tooltipHtml(); // [5d]
                    var modalHtml = value.modalHtml(); // [5d]
                    badgesHtml += value.badgeHtml(); // [5]

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

    var newTask = new Task({
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
    }, user);
    newTask.create();

    interactiveDescriptions += '<div id="task-new-modal">' + newTask.modalHtml() + '</div>';

    $('#strategitica-calendar').html(output); // [5], [7]
    $('#strategitica-descriptions').html(interactiveDescriptions); // [5d], [6], [7]

    $('.badge-title-js').each(function() {
        $(this).html($(md.render($(this).html())).html());
    });

    $('.badge-task-js').on('click', function (e) { // [7]
        var taskId = $(this).data('taskid');
        var taskDescription = $('#task-' + taskId + '-modal').html();
        $('#modal-task').find('.modal-content').html(taskDescription);
        $('#modal-task').modal('show');
    });
}

/**
 * Updates the DOM with the user's current tavern status.
 */
function loadTavernStatus() {
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
        $('#strategitica-tavern-change2').on('click', function () {
            user.changeTavernStatus();
            loadTavernStatus();
        });
    }

    updateHeaderSpacing();
}

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
    template: '<div class="popover" role="tooltip"><div class="arrow"></div><div class="popover-body"></div></div>',
    content: function () {
        return $('#task-' + $(this).data('taskid') + '-tooltip').html()
    }
});

$('body').tooltip({
    selector: '[data-toggle="tooltip"]'
});

$(function() {
    updateHeaderSpacing();
});

Utils.onResize(function () {
    updateHeaderSpacing();
});


// --- Menu link handlers here ---

$('#strategitica-add-daily').on('click', function (e) {
    var taskId = 'new';
    var taskDescription = $('#task-' + taskId + '-modal').html();
    $('#modal-task').find('.modal-content').html(taskDescription);
    TaskActions.edit();
    $('#modal-task').modal('show');
});

$('#strategitica-refresh').on('click', function () {
    loadAll(true);
});

$('#strategitica-tavern-change1').on('click', function () {
    user.changeTavernStatus();
    loadTavernStatus();
});

// --- End menu link handlers ---


$('#modal-task').on('show.bs.modal', function (e) {
    // Let's avoid duplicate IDs, please...
    $(this).find('[id]').each(function () {
        var itemId = $(this).attr('id');
        $(this).attr('id', itemId + '-modal');
    });

    // Gotta change the labels to match the new IDs too
    $(this).find('[for]').each(function () {
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

    $(this).find('.markdown-js').each(function() {
        $(this).html(md.render($(this).html()));
    });

    $(this).find('.markdown-unwrap-js').each(function() {
        $(this).html($(md.render($(this).html())).html());
    });
});


// --- Start task change handlers ---

$(document).on('change', '.task-checklist-item-js', function (e) {
    TaskActions.scoreChecklistItem($(this), user);
    loadAll(false);
});

$(document).on('click', '.btn-task-complete-js', function (e) {
    TaskActions.complete($(this).data('taskid'), $(this).data('tasktitle'), user);
    loadAll(false);
});;

$(document).on('click', '.btn-task-edit-js', function (e) {
    TaskActions.edit();
});

$(document).on('click', '.btn-task-edit-cancel-js', function (e) {
    TaskActions.editCancel();
});

$(document).on('click', '.btn-task-delete-js', function (e) {
    TaskActions.remove($(this).data('taskid'), $(this).data('tasktitle'), user);
    loadAll(false);
});

$(document).on('click', '.btn-task-save-js', function (e) {
    TaskActions.save($(this).data('taskid'), user);
    loadAll(false);
});

$(document).on('change', '#modal-task [name="task-frequency"]', function () {
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

$(document).on('change', '#modal-task [name="task-everyx"]', function () {
    var everyXValue = $(this).val();

    if (parseInt(everyXValue) <= 0 || Number.isNaN(parseInt(everyXValue))) {
        $(this).val(1);
    }

    if (everyXValue % 1 != 0) {
        $(this).val(Math.floor(everyXValue));
    }
});

// --- End task change handlers ---